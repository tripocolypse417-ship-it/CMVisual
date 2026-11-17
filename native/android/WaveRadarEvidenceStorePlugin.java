package com.waveradar.app;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

/**
 * App-private, append-only local evidence journal.
 * No network transmission or destructive API is exposed.
 * Payload encryption, backup/export policy and retention controls are separate gates.
 */
@CapacitorPlugin(name = "WaveRadarEvidenceStore")
public class WaveRadarEvidenceStorePlugin extends Plugin {
  private EvidenceDb database;
  private static final int MAX_BATCH = 500;
  private static final int MAX_EVENT_BYTES = 65536;
  private static final int MAX_PAGE = 500;

  @Override
  public void load() {
    database = new EvidenceDb(getContext().getApplicationContext());
  }

  @PluginMethod
  public void appendEvents(PluginCall call) {
    JSArray events = call.getArray("events");
    if (events == null || events.length() == 0 || events.length() > MAX_BATCH) {
      call.reject("events must contain between 1 and " + MAX_BATCH + " records");
      return;
    }
    SQLiteDatabase db = database.getWritableDatabase();
    int inserted = 0;
    int duplicates = 0;
    JSArray collisions = new JSArray();
    JSArray invalid = new JSArray();
    db.beginTransaction();
    try {
      for (int i = 0; i < events.length(); i++) {
        JSONObject event = events.optJSONObject(i);
        if (event == null) {
          invalid.put(i);
          continue;
        }
        String eventId = event.optString("eventId", "").trim();
        String incidentId = event.optString("incidentId", "").trim();
        if (eventId.isEmpty() || incidentId.isEmpty()) {
          invalid.put(i);
          continue;
        }
        String encoded = event.toString();
        if (encoded.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAX_EVENT_BYTES) {
          invalid.put(i);
          continue;
        }
        Cursor existing = db.query("evidence_events", new String[]{"event_json"}, "event_id = ?", new String[]{eventId}, null, null, null, "1");
        boolean exists = false;
        String prior = null;
        try {
          if (existing.moveToFirst()) {
            exists = true;
            prior = existing.getString(0);
          }
        } finally {
          existing.close();
        }
        if (exists) {
          if (encoded.equals(prior)) duplicates++;
          else collisions.put(eventId);
          continue;
        }
        android.content.ContentValues values = new android.content.ContentValues();
        values.put("event_id", eventId);
        values.put("incident_id", incidentId);
        values.put("captured_at", event.isNull("capturedAt") ? null : event.optLong("capturedAt"));
        values.put("received_at", event.isNull("receivedAt") ? null : event.optLong("receivedAt"));
        values.put("clock_domain", event.optString("clockDomain", null));
        values.put("event_json", encoded);
        db.insertOrThrow("evidence_events", null, values);
        inserted++;
      }
      db.setTransactionSuccessful();
    } catch (Exception error) {
      call.reject("Evidence batch was not committed: " + error.getMessage());
      return;
    } finally {
      db.endTransaction();
    }
    JSObject result = new JSObject();
    result.put("inserted", inserted);
    result.put("duplicates", duplicates);
    result.put("collisions", collisions);
    result.put("invalidIndexes", invalid);
    result.put("storage", "ANDROID_APP_PRIVATE_SQLITE");
    result.put("durability", "LOCAL_DATABASE_COMMIT");
    result.put("networkTransfer", false);
    call.resolve(result);
  }

  @PluginMethod
  public void readEvents(PluginCall call) {
    String incidentId = call.getString("incidentId");
    if (incidentId == null || incidentId.trim().isEmpty()) {
      call.reject("incidentId is required");
      return;
    }
    long afterSequence = Math.max(0L, call.getLong("afterSequence", 0L));
    int limit = Math.max(1, Math.min(MAX_PAGE, call.getInt("limit", 100)));
    JSArray output = new JSArray();
    SQLiteDatabase db = database.getReadableDatabase();
    Cursor cursor = db.query("evidence_events", new String[]{"row_id", "event_json"},
      "incident_id = ? AND row_id > ?", new String[]{incidentId, String.valueOf(afterSequence)},
      null, null, "row_id ASC", String.valueOf(limit));
    long nextSequence = afterSequence;
    try {
      while (cursor.moveToNext()) {
        nextSequence = cursor.getLong(0);
        output.put(new JSObject(cursor.getString(1)));
      }
    } catch (Exception error) {
      call.reject("Could not read evidence journal: " + error.getMessage());
      return;
    } finally {
      cursor.close();
    }
    JSObject result = new JSObject();
    result.put("events", output);
    result.put("nextSequence", nextSequence);
    result.put("limit", limit);
    result.put("storage", "ANDROID_APP_PRIVATE_SQLITE");
    call.resolve(result);
  }

  @PluginMethod
  public void getStatus(PluginCall call) {
    SQLiteDatabase db = database.getReadableDatabase();
    Cursor cursor = db.rawQuery("SELECT COUNT(*), COALESCE(MAX(row_id), 0) FROM evidence_events", null);
    try {
      cursor.moveToFirst();
      JSObject result = new JSObject();
      result.put("available", true);
      result.put("eventCount", cursor.getLong(0));
      result.put("latestSequence", cursor.getLong(1));
      result.put("storage", "ANDROID_APP_PRIVATE_SQLITE");
      result.put("encryptedAtRest", false);
      result.put("networkTransfer", false);
      call.resolve(result);
    } finally {
      cursor.close();
    }
  }

  private static final class EvidenceDb extends SQLiteOpenHelper {
    EvidenceDb(Context context) {
      super(context, "waveradar_evidence.db", null, 1);
    }
    @Override public void onCreate(SQLiteDatabase db) {
      db.execSQL("CREATE TABLE evidence_events (" +
        "row_id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "event_id TEXT NOT NULL UNIQUE," +
        "incident_id TEXT NOT NULL," +
        "captured_at INTEGER," +
        "received_at INTEGER," +
        "clock_domain TEXT," +
        "event_json TEXT NOT NULL)");
      db.execSQL("CREATE INDEX evidence_incident_sequence ON evidence_events(incident_id, row_id)");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
      // Never drop evidence. Future migrations must be additive and versioned.
    }
  }
}
