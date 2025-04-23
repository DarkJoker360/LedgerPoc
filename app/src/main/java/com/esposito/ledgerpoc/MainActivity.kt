package com.esposito.ledgerpoc

import android.os.Bundle
import android.util.Log
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.esposito.ledgerpoc.LedgerUtils.ADPU_GET_VERSION

class MainActivity : AppCompatActivity() {
    private val TAG = "LedgerPoc-MainActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        val usbHandler = UsbHandler(this)
        if(usbHandler.detect()) {
            Log.d(TAG, "Detected Ledger device")
            usbHandler.requestPermission()
            if (usbHandler.hasPermission()) {
                Log.d(TAG, "Building ADPU request")
                val adpuManager = AdpuManager()
                val response = adpuManager.sendUsbCommand(usbHandler.getManager(), usbHandler.getDevice(), ADPU_GET_VERSION)
                if (response != null) {
                    val hex = response.joinToString(" ") { it.toUByte().toString(16).padStart(2, '0') }
                    Log.e(TAG, "Got ADPU response: $hex")
                }
            }
        } else {
            Log.e(TAG, "Ledger device not found.")
        }
    }
}