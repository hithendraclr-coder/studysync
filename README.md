# StudySync — Student Productivity Hub

StudySync is a responsive student workspace for organizing study tasks, assignment deadlines, revision notes, exams, and focused study sessions.

## Features

- **Dashboard:** Today's study plan, pending assignments, upcoming exams, study time, and streak overview.
- **Study Planner:** Create, edit, search, complete, and delete study tasks with dates, times, duration, subject, and priority.
- **Assignment Manager:** Track deadlines, mark work complete, and filter pending, completed, or overdue assignments.
- **Notes Library:** Create, search, edit, copy, and delete subject-wise revision notes.
- **Exam Countdown:** Add exams, view days remaining, and update preparation status.
- **Pomodoro Timer:** Focus, short-break, and long-break modes with configurable durations.
- **Progress Dashboard:** Review task completion, focus minutes, weekly focus activity, saved notes, and recent activity.
- **Personalization:** Student profile, dark mode, and reset controls.
- **Responsive UI:** Works on desktop, tablet, and mobile.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage for local persistence
- CSS/HTML visual charts (no chart library)

## Run locally

1. Download or clone the repository.
2. Keep `index.html`, `style.css`, and `script.js` together in the same directory.
3. Open `index.html` in a modern browser.

No build step, backend, API key, or package installation is required.

## Deploy with GitHub Pages

1. Create a GitHub repository and upload all files to the repository root.
2. Open **Settings → Pages**.
3. Under build and deployment, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then save.
5. Wait for GitHub Pages to publish the site.

## Data and privacy

StudySync stores information in the current browser's LocalStorage. It does not send data to a server. Data is not automatically synced between browsers or devices. Clearing browser storage can remove saved information. Export/backup is not currently built in, so keep any important notes separately.

## Project structure

```text
StudySync/
├── index.html
├── style.css
├── script.js
├── README.md
└── .gitignore
```

## Limitations

- Focus sessions are recorded when a focus timer completes; paused or reset sessions are not counted as completed.
- This is a local single-user productivity tool, not a cloud-synced multi-user application.
- A Pomodoro timer is a productivity aid, not a substitute for an individualized study plan.
