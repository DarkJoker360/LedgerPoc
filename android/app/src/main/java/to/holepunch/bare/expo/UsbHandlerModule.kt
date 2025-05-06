package to.holepunch.bare.expo

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbManager
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

class UsbHandlerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val usbManager: UsbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
    private lateinit var usbDevice: UsbDevice
    private lateinit var usbConnection: UsbDeviceConnection
    private val TAG = "UsbHandler"

    companion object {
        private const val USB_VENDOR_ID = 0x2c97
    }

    override fun getName(): String {
        return "UsbHandler"
    }

    @ReactMethod
    fun detect(promise: Promise) {
        val usbList = usbManager.deviceList.values.filter { it.vendorId == USB_VENDOR_ID }
        if (usbList.isEmpty()) {
            promise.resolve(false)
            return
        }
        usbDevice = usbList.first()
        promise.resolve(true)
    }

    @ReactMethod
    fun connect(promise: Promise) {
        if (!usbManager.hasPermission(usbDevice)) {
            requestPermission()
        }
        usbConnection = usbManager.openDevice(usbDevice) ?: run {
            promise.reject("USB_ERROR", "Could not open device")
            return
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun hasPermission(promise: Promise) {
        promise.resolve(usbManager.hasPermission(usbDevice))
    }

    @ReactMethod
    fun getFileDescriptor(promise: Promise) {
        try {
            promise.resolve(usbConnection.fileDescriptor)
        } catch (e: Exception) {
            promise.reject("USB_ERROR", "Failed to get file descriptor: ${e.message}")
        }
    }

    @ReactMethod
    fun getDevice(promise: Promise) {
        try {
            promise.resolve(usbDevice)
        } catch (e: Exception) {
            promise.reject("USB_ERROR", "Failed to get device: ${e.message}")
        }
    }

    @ReactMethod
    fun getManager(promise: Promise) {
        try {
            promise.resolve(usbManager)
        } catch (e: Exception) {
            promise.reject("USB_ERROR", "Failed to get device: ${e.message}")
        }
    }

    private fun requestPermission() {
        Log.d(TAG, "Requesting usb permission")
        val permissionIntent = PendingIntent.getBroadcast(
            reactContext,
            0,
            Intent("to.holepunch.bare.expo.USB_PERMISSION"),
            PendingIntent.FLAG_IMMUTABLE
        )
        usbManager.requestPermission(usbDevice, permissionIntent)
    }

    @ReactMethod
    fun sendApduCommand(base64Command: String, promise: Promise) {
        try {
            val apduCommand = Base64.decode(base64Command, Base64.DEFAULT)
    
            val response = sendUsbCommand(usbManager, usbDevice, apduCommand)
    
            if (response == null) {
                promise.reject("USB_ERROR", "No response or communication error")
            } else {
                val base64Response = Base64.encodeToString(response, Base64.NO_WRAP)
                promise.resolve(base64Response)
            }
        } catch (e: Exception) {
            promise.reject("USB_ERROR", "Failed to send APDU: ${e.message}")
        }
    }
    
    private fun sendUsbCommand(
        usbManager: UsbManager,
        device: UsbDevice,
        apduCommand: ByteArray
    ): ByteArray? {
        val connection = usbManager.openDevice(device) ?: return null
        val usbInterface = device.getInterface(0)
        val outEndpoint = (0 until usbInterface.endpointCount)
            .map { usbInterface.getEndpoint(it) }
            .first { it.direction == UsbConstants.USB_DIR_OUT }
    
        val inEndpoint = (0 until usbInterface.endpointCount)
            .map { usbInterface.getEndpoint(it) }
            .first { it.direction == UsbConstants.USB_DIR_IN }
    
        connection.claimInterface(usbInterface, true)
    
        val channelId = 0x0101
        val tag = 0x05
        val maxPacketSize = 64
        val header = ByteBuffer.allocate(7).apply {
            order(ByteOrder.BIG_ENDIAN)
            putShort(channelId.toShort())
            put(tag.toByte())
            putShort(0)
            putShort(apduCommand.size.toShort())
        }
    
        val packets = mutableListOf<ByteArray>()
        val firstPacketPayload = apduCommand.copyOfRange(0, minOf(apduCommand.size, maxPacketSize - 7))
        val firstPacket = ByteArray(maxPacketSize)
        System.arraycopy(header.array(), 0, firstPacket, 0, 7)
        System.arraycopy(firstPacketPayload, 0, firstPacket, 7, firstPacketPayload.size)
        packets.add(firstPacket)
    
        var seq = 1
        var offset = firstPacketPayload.size
        while (offset < apduCommand.size) {
            val remaining = apduCommand.size - offset
            val chunkSize = minOf(remaining, maxPacketSize - 5)
    
            val packet = ByteArray(maxPacketSize)
            val subHeader = ByteBuffer.allocate(5).apply {
                order(ByteOrder.BIG_ENDIAN)
                putShort(channelId.toShort())
                put(tag.toByte())
                putShort(seq.toShort())
            }
    
            System.arraycopy(subHeader.array(), 0, packet, 0, 5)
            System.arraycopy(apduCommand, offset, packet, 5, chunkSize)
    
            packets.add(packet)
            offset += chunkSize
            seq++
        }
    
        for (pkt in packets) {
            val sent = connection.bulkTransfer(outEndpoint, pkt, pkt.size, 2000)
            if (sent <= 0) {
                Log.e(TAG, "No response given")
                return null
            }
        }
    
        val response = ByteArrayOutputStream()
        var readSeq = 0
        var remainingBytes = -1
    
        while (true) {
            val buffer = ByteArray(maxPacketSize)
            val received = connection.bulkTransfer(inEndpoint, buffer, buffer.size, 5000)
            if (received <= 0) break
    
            val receivedBuffer = buffer.copyOf(received)
            val receivedTag = receivedBuffer[2].toInt() and 0xFF
            val receivedSequence = ByteBuffer.wrap(receivedBuffer, 3, 2).short.toInt()
    
            if (receivedTag != tag || receivedSequence != readSeq) {
                Log.e(TAG, "Bad information received")
                return null
            }
    
            val dataOffset = if (readSeq == 0) 7 else 5
            val dataLength = received - dataOffset
    
            if (readSeq == 0) {
                remainingBytes = ByteBuffer.wrap(receivedBuffer, 5, 2).short.toInt()
            }
    
            response.write(receivedBuffer, dataOffset, dataLength)
            readSeq++
    
            if (response.size() >= remainingBytes) break
        }
    
        return response.toByteArray()
    }    
}
