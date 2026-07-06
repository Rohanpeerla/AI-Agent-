import { GmailMessage, CalendarEvent } from './types';

export const DEMO_EMAILS: GmailMessage[] = [
  {
    id: "msg_1",
    threadId: "thread_1",
    from: "DevOps Sentinel <sentinel@enterprise-ops.com>",
    subject: "[URGENT] CRITICAL SLA BREACH: Production database replica lagging",
    date: "Today, 06:15 AM",
    snippet: "Database replica db-prod-replica-3 has fallen 4.2 GB behind primary instance. SLA breach imminent if unresolved within 45 minutes...",
    body: `Alert ID: AL-99214
Severity: CRITICAL
Timestamp: 2026-07-05T13:15:00Z
Details: The secondary database replica db-prod-replica-3 has encountered high disk I/O load, causing it to fall 4.2 GB behind the primary master. This is affecting read operations in the EMEA region and is close to violating our 99.9% uptime SLA.
Recommended Action: SSH into db-prod-replica-3, check active processes, and perform a warm reboot of the synchronization service if necessary. Contact @Rohan immediately if secondary thread remains blocked.`,
    isUnread: true,
    category: "Urgent"
  },
  {
    id: "msg_2",
    threadId: "thread_2",
    from: "Marcus Thorne <marcus.thorne@apex-finance.com>",
    subject: "RE: Q2 Revenue Forecast Spreadsheet Errors Detected",
    date: "Today, 08:30 AM",
    snippet: "Hi Rohan, I noticed several formula mismatch errors in the Q2 forecast sheet. The calculated margins for APAC are off by...",
    body: `Hi Rohan,

I was reviewing the final Q2 revenue forecast spreadsheet we're presenting to the board tomorrow. I noticed several formula mismatch errors in the 'Margins' sheet. The APAC margin formula seems to have been hardcoded instead of dynamically referencing our tax rates, leading to an overstatement of forecasted margins by approximately $2.4M.

Please fix this spreadsheet and send it back to me before our pre-board meeting at 10:00 AM tomorrow.

Best,
Marcus`,
    isUnread: true,
    category: "Urgent"
  },
  {
    id: "msg_3",
    threadId: "thread_3",
    from: "Sarah Jenkins <sarah.jenkins@growth-tech.com>",
    subject: "Urgent: Q2 Spreadsheet Revisions Finished?",
    date: "Yesterday, 05:45 PM",
    snippet: "Hey! Just checking if you finished the Q2 revisions. I need them for the slides tonight so I can prep the deck...",
    body: `Hey!

Just checking if you finished the Q2 spreadsheet revisions. I need them for the growth slides tonight so I can prepare the deck for Marcus. Let me know as soon as they're ready so I can stitch them into the main PowerPoint!

Sarah`,
    isUnread: true,
    category: "Update"
  },
  {
    id: "msg_4",
    threadId: "thread_4",
    from: "Dave Vance <dave.vance@apex-corp.com>",
    subject: "Sync tomorrow morning?",
    date: "Yesterday, 03:20 PM",
    snippet: "Hey Rohan, let's schedule a brief sync tomorrow morning around 09:30 AM to align on the quarterly goals...",
    body: `Hey Rohan,

Let's schedule a brief sync tomorrow morning around 9:30 AM to align on the quarterly goals and make sure we are on the same page. Let me know if that works for you!

Dave`,
    isUnread: true,
    category: "Schedule"
  }
];

export const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: "event_1",
    summary: "APAC Ops Strategy Sync",
    start: `${new Date().toISOString().split('T')[0]}T09:00:00`,
    end: `${new Date().toISOString().split('T')[0]}T10:00:00`,
    description: "Quarterly review of our operations, margins, and regional strategy.",
    location: "Zoom Video Call",
    clash: true,
    clashWith: "Marcus / Rohan Pre-board Sync"
  },
  {
    id: "event_2",
    summary: "Marcus / Rohan Pre-board Sync",
    start: `${new Date().toISOString().split('T')[0]}T09:30:00`,
    end: `${new Date().toISOString().split('T')[0]}T10:15:00`,
    description: "Align on the final Q2 revenue slide content and financial model.",
    location: "Boardroom 4B / Meet Link",
    clash: true,
    clashWith: "APAC Ops Strategy Sync"
  },
  {
    id: "event_3",
    summary: "Engineering All-Hands",
    start: `${new Date().toISOString().split('T')[0]}T14:00:00`,
    end: `${new Date().toISOString().split('T')[0]}T15:00:00`,
    description: "Monthly update on cloud migration progress and DevOps timelines.",
    location: "Main Auditorium / YouTube Stream",
    clash: false
  }
];

export const MOCK_BRIEFING = {
  audioText: "Rise and shine, Rohan. Here is your morning briefing for today, July sixth. We have a highly critical alert on the DevOps side: your production database replica has been lagging by four point two gigabytes, posing an imminent threat of violating our SLA agreement. Furthermore, Marcus Thorne flagged an error in your Q2 APAC revenue formula which overstates margins by two point four million dollars. He requires a corrected file by ten AM. To complicate things, you have a direct schedule clash: your APAC Ops Strategy Sync starts at nine AM on Zoom, overlapping with your Pre-board Sync with Marcus at nine-thirty. I recommend adjusting your schedule and tackling the APAC database replica lag first thing.",
  executiveSummary: `*   **Critical Alerts**: Production database replica is lagging 4.2 GB; SLA violation is imminent if unresolved immediately.
*   **Action Required**: Q2 revenue formula APAC margins are overstated by **$2.4M**. Corrected spreadsheet must be sent to Marcus before **10:00 AM**.
*   **Schedule Clash**: **APAC Ops Strategy Sync** (09:00 - 10:00) overlaps with **Pre-board Sync with Marcus** (09:30 - 10:15).
*   **DevOps Support**: SSH check required for replica sync synchronization on thread db-prod-replica-3.`,
  timelineClashes: [
    {
      title: "Ops Strategy Sync overlaps with Pre-board Review",
      description: "APAC Ops Strategy Sync (09:00 AM - 10:00 AM) overlaps with Marcus / Rohan Pre-board Sync (09:30 AM - 10:15 AM). This gives you only 30 minutes for the strategy sync or forces an overlap of 30 minutes during a high-priority financial alignment.",
      events: ["APAC Ops Strategy Sync", "Marcus / Rohan Pre-board Sync"]
    }
  ],
  urgentActions: [
    {
      title: "Resolve db-prod-replica-3 Lag",
      description: "Database replica has fallen 4.2 GB behind. Imminent SLA breach. Action: Warm reboot of replica thread.",
      sourceEmailId: "msg_1",
      dueDate: "Immediate"
    },
    {
      title: "Correct APAC Revenue Margin Formula",
      description: "Fix APAC tax hardcoding error in Q2 spreadsheet. Send to Marcus Thorne before 10:00 AM.",
      sourceEmailId: "msg_2",
      dueDate: "10:00 AM"
    }
  ]
};
