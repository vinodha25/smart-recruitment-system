# Dashboard Update - Rejected Candidates Metric

## ✅ Changes Made

### 1. Added "Rejected Candidates" Stat Card

**Location**: `src/pages/Dashboard.tsx`

- Added `UserX` icon import from lucide-react
- Changed stats grid from 4 columns to 5 columns (`lg:grid-cols-5`)
- Added new StatCard showing:
  - **Title**: "Rejected Candidates"
  - **Value**: 342
  - **Change**: "28 this month"
  - **Icon**: UserX (person with X icon)
  - **Variant**: danger (red/destructive theme)

### 2. Updated StatCard Component

**Location**: `src/components/dashboard/StatCard.tsx`

- Added `"danger"` variant to the TypeScript type definition
- Added danger variant styling: `bg-destructive/10 text-destructive`
- This gives the rejected candidates card a red/warning appearance

## 📊 Dashboard Stats Overview

The dashboard now displays **5 key metrics**:

1. **Total Candidates**: 1,247 (+12% from last month)
2. **Open Positions**: 24 (4 urgent)
3. **Interviews This Week**: 18 (+3 from last week)
4. **Rejected Candidates**: 342 (28 this month) ← **NEW**
5. **Avg. Time to Hire**: 23 days (-5 days improvement)

## 🎨 Visual Design

The rejected candidates card features:
- Red/destructive color theme (danger variant)
- UserX icon (person with X mark)
- Neutral change indicator (not positive/negative)
- Consistent card styling with other metrics

## 🚀 How to View

1. Navigate to http://localhost:8080/
2. The dashboard will show all 5 stat cards in the top section
3. The "Rejected Candidates" card appears between "Interviews This Week" and "Avg. Time to Hire"

## 📝 Notes

- The dev server auto-reloads, so changes are immediately visible
- All TypeScript errors have been resolved
- The card uses demo data (342 rejected, 28 this month)
- When connected to the backend API, this will show real data from the database

---

**Status**: ✅ Complete and deployed
**Date**: 2026-01-20
