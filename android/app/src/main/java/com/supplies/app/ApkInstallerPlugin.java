package com.supplies.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * 앱 내 업데이트: 새 APK를 DownloadManager로 받아 진행률을 알리고,
 * 완료되면 안드로이드 설치 화면을 바로 띄운다.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    private static final String APK_MIME = "application/vnd.android.package-archive";
    private final Handler handler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("allowed", canRequestInstall());
        call.resolve(ret);
    }

    // "출처를 알 수 없는 앱 설치" 권한 화면을 연다.
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent i = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "update.apk");
        if (url == null) {
            call.reject("url이 필요합니다");
            return;
        }
        if (!canRequestInstall()) {
            call.reject("설치 권한이 필요합니다", "NEED_PERMISSION");
            return;
        }

        final Context ctx = getContext();
        File dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        final File file = new File(dir, fileName);
        if (file.exists()) file.delete();

        final DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url))
            .setTitle("Kangaroo 업데이트")
            .setDescription(fileName)
            .setMimeType(APK_MIME)
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setDestinationInExternalFilesDir(ctx, Environment.DIRECTORY_DOWNLOADS, fileName);
        final long id = dm.enqueue(req);

        // 0.5초마다 상태를 확인해 진행률을 보내고, 끝나면 설치 화면을 연다.
        handler.post(new Runnable() {
            @Override
            public void run() {
                try (Cursor c = dm.query(new DownloadManager.Query().setFilterById(id))) {
                    if (c == null || !c.moveToFirst()) {
                        call.reject("다운로드가 취소되었습니다");
                        return;
                    }
                    int status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                    long done = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                    long total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));

                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        emitProgress(100);
                        install(file);
                        call.resolve();
                        return;
                    }
                    if (status == DownloadManager.STATUS_FAILED) {
                        call.reject("다운로드에 실패했습니다");
                        return;
                    }
                    if (total > 0) emitProgress((int) (done * 100 / total));
                } catch (Exception e) {
                    call.reject("다운로드 확인 중 오류: " + e.getMessage());
                    return;
                }
                handler.postDelayed(this, 500);
            }
        });
    }

    private void emitProgress(int percent) {
        JSObject data = new JSObject();
        data.put("percent", percent);
        notifyListeners("progress", data);
    }

    private void install(File file) {
        Context ctx = getContext();
        Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, APK_MIME);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(i);
    }

    private boolean canRequestInstall() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return getContext().getPackageManager().canRequestPackageInstalls();
        }
        return true;
    }
}
