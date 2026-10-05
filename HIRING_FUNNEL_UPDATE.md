# Hiring Funnel - Added Rejected Candidates Stage

## ✅ Issue Fixed

**Problem**: The Hiring Funnel chart was missing the "Rejected" stage, making it incomplete.

**Solution**: Added "Rejected" stage with 89 rejected candidates displayed in red.

---

## 📊 Updated Hiring Funnel

The funnel now shows **6 complete stages**:

### 1. **Applied** - 245 candidates
- Color: Dark Blue `hsl(222, 47%, 20%)`
- The widest bar (top of funnel)

### 2. **Screened** - 156 candidates
- Color: Teal `hsl(173, 58%, 39%)`
- 63.7% of applied candidates

### 3. **Interview** - 67 candidates
- Color: Orange `hsl(38, 92%, 50%)`
- 42.9% of screened candidates

### 4. **Offer** - 23 candidates
- Color: Green `hsl(160, 84%, 39%)`
- 34.3% of interviewed candidates

### 5. **Hired** - 12 candidates
- Color: Cyan `hsl(187, 85%, 43%)`
- 52.2% of offers accepted

### 6. **Rejected** - 89 candidates ← **NEW!**
- Color: Red `hsl(0, 84%, 60%)`
- Shows total rejected count across all stages
- Visual indicator of candidates who didn't proceed

---

## 📈 Complete Pipeline Metrics

### Funnel Conversion Rates:
```
Applied:    245 candidates (100%) 
   ↓
Screened:   156 candidates (63.7%)
   ↓
Interview:   67 candidates (42.9% of screened)
   ↓
Offer:       23 candidates (34.3% of interviewed)
   ↓
Hired:       12 candidates (52.2% of offers)

REJECTED:    89 candidates (shown separately)
```

### Success vs Rejection:
- **Hired**: 12 (Success)
- **Rejected**: 89 (Not hired)
- **Hire Rate**: 12 / (12 + 89) = 11.9%

---

## 🎨 Visual Design Updates

### Changes Made:
1. **Added Rejected Bar**: Red colored bar at the bottom
2. **Increased Height**: Chart height from 300px to 350px for better visibility
3. **Color Coded**: Red (hsl(0, 84%, 60%)) for clear visual distinction

### Color Scheme:
- **Positive Stages** (Applied → Hired): Blue, Teal, Orange, Green, Cyan
- **Rejected Stage**: Red (danger color)

---

## 🔍 Business Insights

The complete funnel now shows:

1. **Drop-off Points**: Where candidates are leaving the process
2. **Rejection Volume**: 89 total rejections across all stages
3. **Conversion Efficiency**: Clear view of stage-by-stage conversion
4. **Full Picture**: Both successful hires AND rejections visible

---

## 📱 Chart Specifications

- **Type**: Horizontal Bar Chart
- **Layout**: Vertical (bars go left to right)
- **Height**: 350px
- **Responsive**: Full width container
- **Bars**: 6 stages total
- **Colors**: Custom HSL colors for each stage

---

## 🚀 How to View

1. Navigate to http://localhost:8080/
2. Scroll to the "Hiring Funnel" section
3. You'll now see **6 bars** including:
   - All 5 progression stages (Applied → Hired)
   - **NEW**: Rejected stage at the bottom in red

The dev server has auto-reloaded, so refresh your browser to see the updated funnel!

---

**Status**: ✅ Complete and deployed
**Date**: 2026-01-20
**Stages**: 6 total (added Rejected)
