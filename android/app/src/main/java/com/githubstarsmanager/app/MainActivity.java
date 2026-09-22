package com.githubstarsmanager.app;

import android.view.View;
import android.webkit.ValueCallback;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBarInsets();
        installBackHandler();
    }

    /**
     * Android 15+ 强制 edge-to-edge 时，把状态栏、导航栏和键盘的 insets
     * 垫进 WebView，避免页面顶到系统栏下面。
     */
    private void applySystemBarInsets() {
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) return;
        View webView = bridge.getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    /**
     * 系统返回先交给页面：关掉浮层或回到仓库列表。页面返回 exit 时才退出应用。
     */
    private void installBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Bridge bridge = getBridge();
                if (bridge == null || bridge.getWebView() == null) {
                    finishApp(this);
                    return;
                }
                bridge.eval(
                    "(function(){try{return window.__gsmAndroidBack?String(window.__gsmAndroidBack()):'exit';}catch(e){return 'exit';}})()",
                    (ValueCallback<String>) value -> {
                        if (isHandled(value)) return;
                        finishApp(this);
                    }
                );
            }
        });
    }

    private void finishApp(OnBackPressedCallback callback) {
        runOnUiThread(() -> {
            callback.setEnabled(false);
            getOnBackPressedDispatcher().onBackPressed();
            callback.setEnabled(true);
        });
    }

    private static boolean isHandled(String value) {
        if (value == null) return false;
        return "handled".equals(value.replace("\"", "").trim());
    }
}
