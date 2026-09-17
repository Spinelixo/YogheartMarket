package com.yogheart.market;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setBackgroundColor(android.graphics.Color.WHITE);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            // Scale text/UI zoom to 80% strictly in APK so more content fits cleanly on S23 Ultra
            settings.setTextZoom(80);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
        }
    }
}
