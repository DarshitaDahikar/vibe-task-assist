# TaskPilot AI

TaskPilot — Vibe Coding Build Prompt

Paste this into Lovable (or Bolt) as your first message.

Build a web app called "TaskPilot" — an AI assistant that turns pasted messages/emails into organized tasks and tells the user what to work on right now.

Pages needed:

1. Landing/Home page

Clean hero section: "Turn scattered messages into a clear to-do list" with a short subtext explaining the problem (info spread across WhatsApp, email, notices)

Big textarea input: "Paste your message, email, or notice..."

3 clickable example buttons that auto-fill the textarea with sample text:

Example 1: "Your DBMS assignment is due Thursday. Project review is Friday at 3 PM. Don't forget to send the report to Rahul before Wednesday."

Example 2: "Reminder: Submit your internship application by this Friday 5 PM. Interview call scheduled for next Monday 11 AM with HR."

Example 3: "Team, please finish the UI mockups by tomorrow evening and share the client presentation deck before Thursday's meeting at 2 PM."

A button: "✨ Analyze"

2. Results/Confirmation screen (after Analyze is clicked)

Show a card: "I found X actionable items"

List extracted items, each with: type (Task / Deadline / Event), title, due date/time, priority (color-coded: red=high, orange=medium, yellow=low)

Each item should be editable (title, date, priority) before saving

Two buttons: "Create All" and "Discard"

3. Dashboard page

Two sections: "TODAY" and "UPCOMING"

Each task shown as a card with: title, due time/date, priority color, checkbox to mark complete

A prominent big button at the top: "✨ What should I work on now?"

When clicked, call the AI with the full task list + current time, and show a response like: "Work on [X] now. It's due [when], takes about [estimate], and fits your current free time."

A small sidebar/card titled "🧠 Insight" showing a static/seeded personalization message like: "You tend to complete coding tasks in the evening — I've scheduled accordingly." (this can be hardcoded for now, not live-learned)

Backend / Data needs:

Use a database (Supabase) to store tasks: fields = title, type (task/deadline/event), due_date, due_time, priority, status (pending/complete), created_at

Use Claude API (I will provide the API key) to:

Extract structured tasks/deadlines/events/people from pasted text — return as JSON

Given the current task list + time of day, recommend the single best next task with a one-line reason

Design:

Clean, modern SaaS style — soft shadows, rounded cards, a calm color palette (blues/greens), NOT generic purple-gradient AI-app look

Fully responsive for mobile and desktop

Prioritize clarity over decoration — this is a productivity tool

Important:

Do not build user login/auth for now — keep it single-user, no signup friction, so judges can test instantly

Make sure the "What should I work on now?" button is fast and prominent — it's the core demo feature

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/13240e8f-8355-4942-a2d5-36d13476448b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
