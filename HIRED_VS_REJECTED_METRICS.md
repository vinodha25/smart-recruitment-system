# Dashboard Metrics Update - Hired vs Rejected Candidates

## ✅ Changes Made

### Added "Hired Candidates" Metric

**Location**: `src/pages/Dashboard.tsx`

- Added `UserCheck` icon import from lucide-react
- Changed stats grid from 5 columns to **6 columns** (`lg:grid-cols-6`)
- Added new StatCard showing hired candidates

---

## 📊 Dashboard Metrics Overview

The dashboard now displays **6 key metrics** in this order:

### 1. **Total Candidates** 
- Value: **1,247**
- Change: +12% from last month
- Icon: Users
- Color: Primary (Blue)

### 2. **Open Positions**
- Value: **24**
- Change: 4 urgent
- Icon: Briefcase
- Color: Accent (Cyan)

### 3. **Interviews This Week**
- Value: **18**
- Change: +3 from last week
- Icon: Calendar
- Color: Success (Green)

### 4. **Hired Candidates** ← **NEW!**
- Value: **89**
- Change: 12 this month
- Icon: UserCheck (person with checkmark)
- Color: Success (Green)

### 5. **Rejected Candidates**
- Value: **342**
- Change: 28 this month
- Icon: UserX (person with X)
- Color: Danger (Red)

### 6. **Avg. Time to Hire**
- Value: **23 days**
- Change: -5 days improvement
- Icon: TrendingUp
- Color: Warning (Orange)

---

## 📈 Hired vs Rejected Comparison

### Visual Comparison:
```
✅ HIRED:     89 candidates (12 this month)  [GREEN]
❌ REJECTED: 342 candidates (28 this month)  [RED]
```

### Key Insights:
- **Hired to Rejected Ratio**: 1:3.8
- **Acceptance Rate**: ~21% (89 hired out of 431 total decisions)
- **Monthly Hiring**: 12 new hires this month
- **Monthly Rejections**: 28 rejections this month

### Color Coding:
- **Hired Candidates**: Green (success variant) - positive outcome
- **Rejected Candidates**: Red (danger variant) - negative outcome
- Side-by-side placement for easy visual comparison

---

## 🎨 Visual Design

### Hired Candidates Card:
- **Icon**: UserCheck (✓ checkmark on person)
- **Color**: Green/Success theme
- **Sentiment**: Positive (green indicator)
- **Position**: 4th card (between Interviews and Rejected)

### Rejected Candidates Card:
- **Icon**: UserX (✗ X mark on person)
- **Color**: Red/Danger theme
- **Sentiment**: Neutral indicator (not negative, as rejections are normal)
- **Position**: 5th card (right after Hired)

---

## 📱 Responsive Layout

- **Mobile (< 768px)**: 2 columns
- **Tablet (768px - 1024px)**: 2 columns
- **Desktop (> 1024px)**: 6 columns (all metrics in one row)

---

## 🚀 How to View

1. Navigate to http://localhost:8080/
2. The dashboard will show all 6 stat cards in the top section
3. **Hired Candidates** (green) and **Rejected Candidates** (red) are placed side-by-side for easy comparison

---

## 💡 Business Value

This comparison helps HR teams:
- **Track hiring success rate** at a glance
- **Monitor rejection trends** to identify potential issues
- **Compare hiring velocity** vs rejection rate
- **Identify bottlenecks** in the hiring pipeline
- **Make data-driven decisions** about recruitment strategies

---

**Status**: ✅ Complete and deployed
**Date**: 2026-01-20
**Metrics**: 6 total (added Hired Candidates)
