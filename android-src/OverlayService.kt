package com.motoganhos

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

class OverlayService : Service() {

    companion object {
        private var wm:          WindowManager? = null
        private var root:        View?          = null
        private val handler      = Handler(Looper.getMainLooper())
        private var autoClose:   Runnable?      = null

        fun show(
            context: Context,
            gross:   Double, dist:  Double, dur:    Double,
            rating:  Double, signal: String, score: Int,
            perKm:   Double, perHour: Double, perMin: Double,
            net:     Double,
        ) {
            // Verifica permissão SYSTEM_ALERT_WINDOW
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !Settings.canDrawOverlays(context)) return

            handler.post {
                dismissNow()
                buildAndShow(context, gross, dist, dur, rating, signal, perKm, perHour, perMin, net)
            }
        }

        private fun buildAndShow(
            ctx:    Context,
            gross:  Double, dist: Double, dur:   Double,
            rating: Double, signal: String,
            perKm:  Double, perHour: Double, perMin: Double,
            net:    Double,
        ) {
            val accent = when (signal) {
                "green"  -> Color.parseColor("#00C853")
                "yellow" -> Color.parseColor("#FFD600")
                else     -> Color.parseColor("#FF1744")
            }

            // ── Card ────────────────────────────────────────────────────────
            val card = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(ctx, 16), dp(ctx, 14), dp(ctx, 16), dp(ctx, 14))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#F2111111"))
                    cornerRadius = dp(ctx, 18).toFloat()
                    setStroke(dp(ctx, 2), accent)
                }
                elevation = dp(ctx, 10).toFloat()
            }

            // ── Row 1: semáforo + métricas ───────────────────────────────────
            val topRow = LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity     = Gravity.CENTER_VERTICAL
            }

            // Semáforo 3 bolinhas
            val semCol = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                gravity     = Gravity.CENTER_HORIZONTAL
                setPadding(0, 0, dp(ctx, 14), 0)
            }
            listOf("red", "yellow", "green").forEach { s ->
                val sz = dp(ctx, 13)
                semCol.addView(View(ctx).apply {
                    layoutParams = LinearLayout.LayoutParams(sz, sz).also {
                        it.setMargins(0, dp(ctx, 2), 0, dp(ctx, 2))
                    }
                    background = GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(if (s == signal) accent else Color.parseColor("#2C2C2C"))
                    }
                })
            }
            topRow.addView(semCol)

            // Métricas /km | /hora | /min
            val metrics = LinearLayout(ctx).apply {
                orientation  = LinearLayout.HORIZONTAL
                gravity      = Gravity.CENTER_VERTICAL
                layoutParams = LinearLayout.LayoutParams(0,
                    LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            listOf(
                Triple(fmtR(perKm),   "por km",   false),
                Triple(fmtR(perHour), "por hora",  true),
                Triple(fmtR(perMin),  "por min",   true),
            ).forEach { (value, label, withDiv) ->
                if (withDiv) {
                    metrics.addView(View(ctx).apply {
                        layoutParams = LinearLayout.LayoutParams(
                            dp(ctx, 1), dp(ctx, 36)
                        ).also { it.setMargins(dp(ctx, 6), 0, dp(ctx, 6), 0) }
                        setBackgroundColor(Color.parseColor("#2C2C2C"))
                    })
                }
                metrics.addView(LinearLayout(ctx).apply {
                    orientation  = LinearLayout.VERTICAL
                    gravity      = Gravity.CENTER_HORIZONTAL
                    layoutParams = LinearLayout.LayoutParams(0,
                        LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    addView(TextView(ctx).apply {
                        text     = value
                        textSize = 15f
                        gravity  = Gravity.CENTER
                        setTextColor(accent)
                        typeface = Typeface.DEFAULT_BOLD
                    })
                    addView(TextView(ctx).apply {
                        text     = label
                        textSize = 10f
                        gravity  = Gravity.CENTER
                        setTextColor(Color.parseColor("#888888"))
                    })
                })
            }
            topRow.addView(metrics)
            card.addView(topRow)

            // Divider
            card.addView(View(ctx).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(ctx, 1)
                ).also { it.setMargins(0, dp(ctx, 10), 0, dp(ctx, 10)) }
                setBackgroundColor(Color.parseColor("#2C2C2C"))
            })

            // ── Row 2: lucro + rating ────────────────────────────────────────
            val btmRow = LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity     = Gravity.CENTER_VERTICAL
            }
            btmRow.addView(TextView(ctx).apply {
                text         = "Lucro líquido estimado"
                textSize     = 12f
                setTextColor(Color.parseColor("#888888"))
                layoutParams = LinearLayout.LayoutParams(0,
                    LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            })
            btmRow.addView(TextView(ctx).apply {
                text     = fmtR(net)
                textSize = 15f
                setTextColor(accent)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(ctx, 8), 0, 0, 0)
            })
            if (rating > 0) {
                btmRow.addView(TextView(ctx).apply {
                    text     = "  ★ ${String.format("%.1f", rating)}"
                    textSize = 13f
                    setTextColor(Color.parseColor("#FFD600"))
                })
            }
            card.addView(btmRow)

            // Toque para fechar
            card.setOnClickListener { dismissNow() }
            root = card

            // ── WindowManager ────────────────────────────────────────────────
            val wmType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

            val dm    = ctx.resources.displayMetrics
            val hMargin = dp(ctx, 12)
            val lp = WindowManager.LayoutParams(
                dm.widthPixels - hMargin * 2,
                WindowManager.LayoutParams.WRAP_CONTENT,
                wmType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT,
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                x = 0
                y = dp(ctx, 90)
            }

            wm = ctx.applicationContext
                .getSystemService(Context.WINDOW_SERVICE) as WindowManager

            try {
                wm!!.addView(card, lp)
            } catch (e: Exception) {
                e.printStackTrace()
                root = null
                wm   = null
                return
            }

            // Auto-dismiss após 15s
            autoClose = Runnable { dismissNow() }
            handler.postDelayed(autoClose!!, 15_000L)
        }

        fun dismissNow() {
            autoClose?.let { handler.removeCallbacks(it) }
            autoClose = null
            try { root?.let { wm?.removeView(it) } } catch (_: Exception) {}
            root = null
            wm   = null
        }

        private fun fmtR(v: Double): String {
            val s = String.format("%.2f", kotlin.math.abs(v)).replace(".", ",")
            return if (v < 0) "-R$ $s" else "R$ $s"
        }

        private fun dp(ctx: Context, dp: Int) =
            (dp * ctx.resources.displayMetrics.density + 0.5f).toInt()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
