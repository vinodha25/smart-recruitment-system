# Resume Upload & Filtering Logic Guide

This guide explains how the "HireAI" system handles resume uploads and how they appear in your lists based on the active filters.

## 1. Uploading Resumes

There are two ways to upload a resume, and the system behaves differently for each:

### A. General Pool Upload (Default)
*   **How to do it:** Click "Upload Resume" **without** selecting any specific job in the filter panel.
*   **Target:** The resume is tagged as **"General Application"** (no Job ID).
*   **Visibility:** This resume will appear in the main "All Resumes" list.
*   **Auto-Action:** To ensure you see it immediately, the system will **automatically clear any active job filters** when you finish this upload.

### B. Job-Specific Upload
*   **How to do it:** 
    1. Click the **"Filter Jobs"** button.
    2. Select (check) the job you want to hire for (e.g., "Frontend Developer").
    3. Click "Upload Resume".
*   **Target:** The upload dialog will show a badge: **"Target Job: Frontend Developer"**. The resume is explicitly linked to that Job ID.
*   **Visibility:** This resume will appear in "All Resumes" AND when you filter specifically for "Frontend Developer".

---

## 2. Filtering the List

The "Resumes" table changes what it shows based on your selection in the "Filter Jobs" panel:

| Filter State | What You See |
| :--- | :--- |
| **No Filters Active** | **Everything.** You see all "General Pool" candidates + all "Job-Specific" candidates. |
| **Job "X" Selected** | **Only Job X.** You see *only* candidates who applied or were uploaded specifically to Job "X". General pool candidates are HIDDEN. |
| **Multiple Jobs Selected** | **Combined List.** You see candidates for all the selected jobs. |

## 3. The "Missing Resume" Confusion (Solved)

**Why did it seem like resumes were not adding?**
Previously, if you were viewing candidates for "Job A" (Filter Active) and then uploaded a resume to the "General Pool":
1. The upload succeeded.
2. BUT, your screen was still filtering for "Job A".
3. Since "General Pool" resumes don't belong to "Job A", it was hidden from your view immediately.

**The Solution:**
We updated the system so that **if you upload to the General Pool, we automatically turn off the filters.** This ensures your new candidate is always visible right away at the top of the list.
