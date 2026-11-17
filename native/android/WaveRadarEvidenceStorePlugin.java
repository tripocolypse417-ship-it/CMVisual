package com.waveradar.app;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

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
  private static final String KEY_ALIAS = "waveradar_evidence_payload_v1";
  private static final String ENCRYPTED_PREFIX = "wrenc:v1:";

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
            prior = decryptPayload(getContext(), existing.getString(0));
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
        values.put("event_json", encryptPayload(getContext(), encoded));
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
    long afterSequence = Math.max(0L, call.getData().optLong("afterSequence", 0L));
    int limit = Math.max(1, Math.min(MAX_PAGE, call.getData().optInt("limit", 100)));
    JSArray output = new JSArray();
    SQLiteDatabase db = database.getReadableDatabase();
    Cursor cursor = db.query("evidence_events", new String[]{"row_id", "event_json"},
      "incident_id = ? AND row_id > ?", new String[]{incidentId, String.valueOf(afterSequence)},
      null, null, "row_id ASC", String.valueOf(limit));
    long nextSequence = afterSequence;
    try {
      while (cursor.moveToNext()) {
        nextSequence = cursor.getLong(0);
        output.put(new JSObject(decryptPayload(getContext(), cursor.getString(1))));
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
  public void listIncidents(PluginCall call) {
    JSArray incidents = new JSArray();
    SQLiteDatabase db = database.getReadableDatabase();
    Cursor cursor = db.rawQuery(
      "SELECT incident_id, COUNT(*), MAX(row_id), MIN(captured_at), MAX(captured_at) " +
      "FROM evidence_events GROUP BY incident_id ORDER BY MAX(row_id) DESC LIMIT 100", null);
    try {
      while (cursor.moveToNext()) {
        JSObject item = new JSObject();
        item.put("incidentId", cursor.getString(0));
        item.put("eventCount", cursor.getLong(1));
        item.put("latestSequence", cursor.getLong(2));
        item.put("firstCapturedAt", cursor.isNull(3) ? org.json.JSONObject.NULL : cursor.getLong(3));
        item.put("lastCapturedAt", cursor.isNull(4) ? org.json.JSONObject.NULL : cursor.getLong(4));
        incidents.put(item);
      }
    } finally {
      cursor.close();
    }
    JSObject result = new JSObject();
    result.put("incidents", incidents);
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
      Cursor plaintext = db.rawQuery("SELECT COUNT(*) FROM evidence_events WHERE event_json NOT LIKE 'wrenc:v1:%'", null);
      boolean payloadEncrypted = false;
      try { plaintext.moveToFirst(); payloadEncrypted = plaintext.getLong(0) == 0L; } finally { plaintext.close(); }
      result.put("payloadEncryptedAtRest", payloadEncrypted);
      result.put("metadataEncryptedAtRest", false);
      result.put("keyStorage", "ANDROID_KEYSTORE");
      result.put("networkTransfer", false);
      call.resolve(result);
    } finally {
      cursor.close();
    }
  }

  private static SecretKey getOrCreateKey(Context context) throws Exception {
    KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
    keyStore.load(null);
    if (keyStore.containsAlias(KEY_ALIAS)) {
      return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
    }
    KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
    KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
      KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setKeySize(256)
      .setRandomizedEncryptionRequired(true)
      .build();
    generator.init(spec);
    return generator.generateKey();
  }

  private static String encryptPayload(Context context, String plaintext) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey(context));
    byte[] iv = cipher.getIV();
    byte[] encrypted = cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    byte[] combined = new byte[iv.length + encrypted.length];
    System.arraycopy(iv, 0, combined, 0, iv.length);
    System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
    return ENCRYPTED_PREFIX + Base64.encodeToString(combined, Base64.NO_WRAP);
  }

  private static String decryptPayload(Context context, String stored) throws Exception {
    if (stored == null || !stored.startsWith(ENCRYPTED_PREFIX)) return stored;
    byte[] combined = Base64.decode(stored.substring(ENCRYPTED_PREFIX.length()), Base64.NO_WRAP);
    if (combined.length <= 12) throw new IllegalStateException("Encrypted evidence payload is truncated");
    byte[] iv = java.util.Arrays.copyOfRange(combined, 0, 12);
    byte[] ciphertext = java.util.Arrays.copyOfRange(combined, 12, combined.length);
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(context), new GCMParameterSpec(128, iv));
    return new String(cipher.doFinal(ciphertext), java.nio.charset.StandardCharsets.UTF_8);
  }

  private static final class EvidenceDb extends SQLiteOpenHelper {
    EvidenceDb(Context context) {
      super(context, "waveradar_evidence.db", null, 2);
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
      // Additive migration: encrypt existing plaintext payloads in place; never drop evidence.
      if (oldVersion < 2) {
        Cursor cursor = db.query("evidence_events", new String[]{"row_id", "event_json"}, null, null, null, null, null);
        try {
          while (cursor.moveToNext()) {
            String stored = cursor.getString(1);
            if (stored != null && !stored.startsWith(ENCRYPTED_PREFIX)) {
              android.content.ContentValues values = new android.content.ContentValues();
              try {
                values.put("event_json", encryptPayload(getContext(), stored));
              } catch (Exception error) {
                throw new IllegalStateException("Evidence encryption migration failed; existing row preserved", error);
              }
              db.update("evidence_events", values, "row_id = ?", new String[]{String.valueOf(cursor.getLong(0))});
            }
          }
        } finally {
          cursor.close();
        }
      }
    }
  }
}
