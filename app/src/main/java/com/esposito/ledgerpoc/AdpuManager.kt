package com.esposito.ledgerpoc

import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.util.Log
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

class AdpuManager {
    private val TAG = "AdpuManager"

    fun sendUsbCommand(
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

        val channelId = 0x0101 // TODO: check randomization
        val tag = 0x05
        val maxPacketSize = 64
        val header = ByteBuffer.allocate(7)
        header.order(ByteOrder.BIG_ENDIAN)
        header.putShort(channelId.toShort())       // Channel ID
        header.put(tag.toByte())                   // Tag
        header.putShort(0)                         // Sequence idx 0
        header.putShort(apduCommand.size.toShort()) // Total payload length

        val packets = mutableListOf<ByteArray>()
        val firstPacketPayload = apduCommand.copyOfRange(
            0, minOf(apduCommand.size, maxPacketSize - 7)
        )
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
            val subHeader = ByteBuffer.allocate(5)
            subHeader.order(ByteOrder.BIG_ENDIAN)
            subHeader.putShort(channelId.toShort())
            subHeader.put(tag.toByte())
            subHeader.putShort(seq.toShort())

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

        // Response
        val response = ByteArrayOutputStream()
        var readSeq = 0
        var remainingBytes = -1
        while (true) {
            val buffer = ByteArray(maxPacketSize)
            val received = connection.bulkTransfer(inEndpoint, buffer, buffer.size, 5000)
            if (received <= 0) {

                break
            }

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