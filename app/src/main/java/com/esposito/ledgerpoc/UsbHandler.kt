package com.esposito.ledgerpoc

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbManager
import android.util.Log
import com.esposito.ledgerpoc.LedgerUtils.USB_VENDOR_ID

// TODO: better naming
class UsbHandler(private var ctx: Context) {
    private val TAG = "UsbHandler"
    private var usbManager: UsbManager = ctx.getSystemService(Context.USB_SERVICE) as UsbManager
    private lateinit var usbDevice: UsbDevice
    private lateinit var usbConnection: UsbDeviceConnection

    fun detect(): Boolean {
        val usbList = usbManager.deviceList.values.filter { it.vendorId == USB_VENDOR_ID }
        if (usbList.isEmpty()) {
            return false
        }
        usbDevice = usbList.first()
        return true
    }

    fun connect() {
        if (!hasPermission()) {
            requestPermission()
        }
        usbConnection = usbManager.openDevice(usbDevice) ?: return
    }

    fun hasPermission(): Boolean = usbManager.hasPermission(usbDevice)

    fun requestPermission() {
        Log.d(TAG, "Requesting usb permission")
        val permissionIntent = PendingIntent.getBroadcast(
            ctx,
            0,
            Intent("com.esposito.ledgerpoc.USB_PERMISSION"),
            PendingIntent.FLAG_IMMUTABLE
        )
        usbManager.requestPermission(usbDevice, permissionIntent)
    }

    fun getManager(): UsbManager {
        return usbManager
    }

    fun getDevice(): UsbDevice {
        return usbDevice
    }

    fun getFileDescriptor(): Int {
        return usbConnection.fileDescriptor
    }
}