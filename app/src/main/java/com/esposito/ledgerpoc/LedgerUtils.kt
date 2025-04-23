package com.esposito.ledgerpoc

object LedgerUtils {

    const val USB_VENDOR_ID: Int = 0x2c97

    // Adpu requests
    val ADPU_GET_VERSION = byteArrayOf(0xB0.toByte(), 0x01, 0x00, 0x00, 0x00)

}