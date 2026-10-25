package gh.scamcheck.classifier

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OnDeviceCheckTest {
    @Test
    fun reversalWithPinIsScam() {
        val report = OnDeviceCheck.inspect(
            "MTN MoMo: You have received GHS 850 from Kwame. Kindly reverse it now. Approve the reversal with your PIN.",
        )
        assertEquals(Band.SCAM, report.band)
        assertTrue(report.hits.any { it.label.contains("PIN") || it.label.contains("reversal") })
    }

    @Test
    fun extractsShortCodeAndPhone() {
        val report = OnDeviceCheck.inspect("Dial *170# if this was not you. Call 0244123456.")
        assertEquals(listOf("*170#"), report.shortCodes)
        assertEquals(listOf("0244123456"), report.phones)
    }

    @Test
    fun flagsLookalikeBrand() {
        val report = OnDeviceCheck.inspect("M7N MoMo says pay at https://mtn-ghana-reward.support/claim")
        assertTrue(report.lookalikes.any { it.contains("MTN") })
        assertEquals(Band.SCAM, report.band)
    }

    @Test
    fun realReceiptStaysSafe() {
        val report = OnDeviceCheck.inspect(
            "You have received GHS 120.00. Current balance: GHS 245.50. Transaction ID: 18442219034. Do not share your PIN.",
        )
        assertEquals(Band.SAFE, report.band)
    }

    @Test
    fun vagueNoteCannotTell() {
        val report = OnDeviceCheck.inspect("Hello, can we meet at the station after work today please?")
        assertEquals(Band.CANT_TELL, report.band)
    }

    @Test
    fun feeAndFakeBillAreScam() {
        assertEquals(
            Band.SCAM,
            OnDeviceCheck.inspect("You are hired. Pay the uniform fee of GHS 150 to 0244111000 before Monday.").band,
        )
        assertEquals(
            Band.SCAM,
            OnDeviceCheck.inspect("ECG: your power will be cut today. Pay at https://ecg-bill-pay.example/now").band,
        )
    }

    @Test
    fun prizeFeeIsScam() {
        val report = OnDeviceCheck.inspect("You have won GHS 5000. Pay a fee to 0593342211 to claim.")
        assertEquals(Band.SCAM, report.band)
    }
}
