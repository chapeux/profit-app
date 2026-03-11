package com.motoganhos

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.os.Handler
import android.os.Looper

/**
 * Floating overlay window shown on top of any app when a trip is detected.
 * Requires SYSTEM_ALERT_WINDOW permission.
 */
class OverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    companion object {
        const val EXTRA_GROSS        = "gross"
        const val EXTRA_DIST         = "dist"
        const val EXTRA_DUR          = "dur"
        const val EXTRA_RATING       = "rating"
        const val EXTRA_SIGNAL       = "signal"
        const val EXTRA_SCORE        = "score"
        const val EXTRA_PER_KM       = "perKm"
        const val EXTRA_PER_HOUR     = "perHour"
        const val EXTRA_PER_MIN      = "perMin"
        const val EXTRA_NET          = "net"

        fun show(ctx: Context, data: OverlayData) {
            val intent = Intent(ctx, OverlayService::class.java).apply {
                putExtra(EXTRA_GROSS,    data.gross)
                putExtra(EXTRA_DIST,     data.dist)
                putExtra(EXTRA_DUR,      data.dur)
                putExtra(EXTRA_RATING,   data.rating)
                putExtra(EXTRA_SIGNAL,   data.signal)
                putExtra(EXTRA_SCORE,    data.score)
                putExtra(EXTRA_PER_KM,   data.perKm)
                putExtra(EXTRA_PER_HOUR, data.perHour)
                putExtra(EXTRA_PER_MIN,  data.perMin)
                putExtra(EXTRA_NET,      data.net)
            }
            ctx.startService(intent)
        }

        fun hide(ctx: Context) {
            ctx.stopService(Intent(ctx, OverlayService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent ?: return START_NOT_STICKY

        val data = OverlayData(
            gross    = intent.getDoubleExtra(EXTRA_GROSS, 0.0),
            dist     = intent.getDoubleExtra(EXTRA_DIST, 0.0),
            dur      = intent.getDoubleExtra(EXTRA_DUR, 0.0),
            rating   = intent.getDoubleExtra(EXTRA_RATING, 0.0),
            signal   = intent.getStringExtra(EXTRA_SIGNAL) ?: "red",
            score    = intent.getIntExtra(EXTRA_SCORE, 0),
            perKm    = intent.getDoubleExtra(EXTRA_PER_KM, 0.0),
            perHour  = intent.getDoubleExtra(EXTRA_PER_HOUR, 0.0),
            perMin   = intent.getDoubleExtra(EXTRA_PER_MIN, 0.0),
            net      = intent.getDoubleExtra(EXTRA_NET, 0.0),
        )

        removeOverlay()
        showOverlay(data)

        // Auto-dismiss after 15 seconds
        Handler(Looper.getMainLooper()).postDelayed({ removeOverlay() }, 15_000)

        return START_NOT_STICKY
    }

    private fun showOverlay(data: OverlayData) {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            x = 0
            y = 120
        }

        overlayView = buildView(data)
        windowManager?.addView(overlayView, params)
    }

    private fun buildView(data: OverlayData): View {
        val ctx = this

        // Signal colors
        val signalColor = when (data.signal) {
            "green"  -> Color.parseColor("#00D96F")
            "yellow" -> Color.parseColor("#F5A623")
            else     -> Color.parseColor("#E74C3C")
        }
        val borderColor = signalColor

        // Root card
        val card = android.widget.LinearLayout(ctx).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1A1A1A"))
            background = buildRoundedBorder(borderColor)
            setPadding(dp(16), dp(14), dp(16), dp(14))
        }

        // ── Row 1: Semaphore dot + values ─────────────────────────────────
        val row1 = android.widget.LinearLayout(ctx).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        // Semaphore dot
        val dot = View(ctx).apply {
            background = buildCircle(signalColor)
            layoutParams = android.widget.LinearLayout.LayoutParams(dp(18), dp(18)).also {
                it.marginEnd = dp(12)
            }
        }
        row1.addView(dot)

        // Values: /km | /hora | /min
        val valuesLayout = android.widget.LinearLayout(ctx).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        fun valueCell(amount: String, label: String): android.widget.LinearLayout {
            return android.widget.LinearLayout(ctx).apply {
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                addView(TextView(ctx).apply {
                    text = amount
                    textSize = 17f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(signalColor)
                    gravity = Gravity.CENTER
                })
                addView(TextView(ctx).apply {
                    text = label
                    textSize = 11f
                    setTextColor(Color.parseColor("#888888"))
                    gravity = Gravity.CENTER
                })
            }
        }

        fun dividerV(): View = View(ctx).apply {
            setBackgroundColor(Color.parseColor("#333333"))
            layoutParams = android.widget.LinearLayout.LayoutParams(dp(1), dp(32)).also {
                it.topMargin = dp(4)
            }
        }

        valuesLayout.addView(valueCell(formatBRL(data.perKm), "por km"))
        valuesLayout.addView(dividerV())
        valuesLayout.addView(valueCell(formatBRL(data.perHour), "por hora"))
        valuesLayout.addView(dividerV())
        valuesLayout.addView(valueCell(formatBRL(data.perMin), "por min"))
        row1.addView(valuesLayout)

        card.addView(row1)

        // ── Divider ───────────────────────────────────────────────────────
        card.addView(View(ctx).apply {
            setBackgroundColor(Color.parseColor("#2A2A2A"))
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT, dp(1)
            ).also { it.topMargin = dp(10); it.bottomMargin = dp(10) }
        })

        // ── Row 2: Net value + rating ──────────────────────────────────────
        val row2 = android.widget.LinearLayout(ctx).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        row2.addView(TextView(ctx).apply {
            text = "Lucro líquido estimado"
            textSize = 12f
            setTextColor(Color.parseColor("#888888"))
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        })

        row2.addView(TextView(ctx).apply {
            text = formatBRL(data.net)
            textSize = 15f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(if (data.net >= 0) Color.parseColor("#00D96F") else Color.parseColor("#E74C3C"))
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.marginStart = dp(8) }
        })

        if (data.rating > 0) {
            row2.addView(TextView(ctx).apply {
                text = "  ★ ${"%.1f".format(data.rating)}"
                textSize = 13f
                setTextColor(Color.parseColor("#F5A623"))
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).also { it.marginStart = dp(10) }
            })
        }

        card.addView(row2)

        // Tap to dismiss
        card.setOnClickListener { removeOverlay() }

        return card
    }

    private fun buildRoundedBorder(color: Int): android.graphics.drawable.GradientDrawable {
        return android.graphics.drawable.GradientDrawable().apply {
            setColor(Color.parseColor("#1A1A1A"))
            cornerRadius = dp(16).toFloat()
            setStroke(dp(2), color)
        }
    }

    private fun buildCircle(color: Int): android.graphics.drawable.GradientDrawable {
        return android.graphics.drawable.GradientDrawable().apply {
            shape = android.graphics.drawable.GradientDrawable.OVAL
            setColor(color)
        }
    }

    private fun formatBRL(value: Double): String {
        return "R$ ${"%.2f".format(value).replace(".", ",")}"
    }

    private fun dp(value: Int): Int {
        return (value * resources.displayMetrics.density).toInt()
    }

    private fun removeOverlay() {
        overlayView?.let {
            try { windowManager?.removeView(it) } catch (_: Exception) {}
        }
        overlayView = null
    }

    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
    }
}

data class OverlayData(
    val gross: Double,
    val dist: Double,
    val dur: Double,
    val rating: Double,
    val signal: String,
    val score: Int,
    val perKm: Double,
    val perHour: Double,
    val perMin: Double,
    val net: Double,
)
