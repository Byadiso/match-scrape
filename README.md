# Football Tracker & Bet Simulator

A React application for tracking football fixtures, reviewing team performance, and simulating betting strategies using virtual funds.

The application combines monthly fixture calendars, personal match selections, historical results, and bankroll analytics in one interface.

**All stakes, returns, and balances are simulated. The application does not process real bets or real-money transactions.**

## Features

### Football fixtures

- Browse monthly fixtures for six supported clubs.
- View upcoming matches and completed results.
- Display kickoff times in the browser’s local timezone.
- Retrieve fixture data through the football-data.org API.

### Team performance

- Compare monthly wins, losses, and draws.
- Review success, failure, and draw percentages.
- Filter results by club, month, and outcome.
- View recent form within the selected month.

### Personal picks

- Save selected fixtures for later tracking.
- View picks in monthly calendars.
- Track outcomes using color-coded indicators.
- Choose the team to follow when two supported clubs face each other.
- Remove saved picks without deleting existing simulation tickets.

### Bet simulator

- Start each month with **100 PLN in virtual capital**.
- Create individual bets or accumulators from saved picks.
- Enter stakes and decimal odds manually.
- Track available balance, pending stakes, returns, and realized profit or loss.
- Review bankroll charts, monthly results, win rate, and return on investment.
- Refresh results from the API or apply manual simulation outcomes.

## Supported Clubs

| Club | Country |
| --- | --- |
| Arsenal | England |
| Manchester City | England |
| Real Madrid | Spain |
| Barcelona | Spain |
| Bayern Munich | Germany |
| Paris Saint-Germain | France |

The shared club configuration is defined in `src/services/footballApi.js`.

## Technology Stack

- React 19
- Vite 6
- React Router
- Material UI
- Framer Motion
- Browser localStorage and cookies
- football-data.org API
- Node.js test runner and ESLint

## Getting Started

### Prerequisites

- Node.js compatible with the project’s Vite version
- npm
- A football-data.org API key

### Installation

Clone the repository and open its directory:

```bash
git clone <repository-url>
cd <repository-directory>
```

Install dependencies:

```bash
npm ci
```

Create a `.env.local` file in the project root, alongside `package.json`:

```env
FOOTBALL_DATA_API_KEY=your_api_key_here
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite.

If prompted, enter the access code configured in `src/components/AccessGate.jsx`.

> Keep `.env.local` out of version control. Use `.env.example` as the configuration template.

## Application Pages

| Route | Purpose |
| --- | --- |
| `/` | Upcoming fixtures and personal pick tracking |
| `/upcoming-matches` | Browse fixtures and select picks |
| `/low-odds-matches` | View saved picks and calendar outcomes |
| `/previous-matches` | Review historical team performance |
| `/simulator` | Create simulations and track bankroll performance |

## Using the Simulator

1. Open **Upcoming** and mark a future fixture as a pick.
2. Open **Simulator**.
3. Select the matches to include.
4. Choose the team to win and enter decimal odds for each selection.
5. Select a ticket type and enter the stake.
6. Save the simulation.
7. Refresh API results or use the ticket details to apply a manual outcome.

Only fixtures with a future kickoff can be added to new simulations.

### Ticket Types

| Type | Stake behavior | Winning condition |
| --- | --- | --- |
| Single | The entered stake applies separately to each selected match | Each ticket is settled independently |
| Accumulator | One stake covers all selected matches | Every non-void selection must win |

### Settlement Rules

- A winning selection returns the stake multiplied by its decimal odds.
- A losing selection returns zero.
- A draw loses a selection that predicts a team win.
- Cancelled matches are treated as void.
- A void accumulator selection uses odds of `1.00`.
- If every selection is void, the original stake is returned.
- Postponed or suspended matches remain pending until resolved.

Results follow the API’s **final winner**, including extra time or penalties. This differs from a market based only on the result after 90 minutes.

For example:

```text
Stake:          10 PLN
Decimal odds:   2.00
Gross return:   20 PLN
Net profit:     10 PLN
```

Returns include the original stake.

### Result Updates

Use **Refresh API results** to update fixtures for a selected match month.

Manual overrides remain active until **Use API result** is selected. Repeated refreshes recalculate the ticket without crediting the same return more than once.

## Monthly Bankroll Accounting

Each calendar month begins independently with **100 PLN**. Unused funds and profits do not carry into the next month.

A ticket belongs to the month it was created, even if its matches finish in a later month.

| Metric | Calculation |
| --- | --- |
| Available balance | Opening bankroll + gross returns − total stakes |
| Pending stakes | Stakes held in unresolved tickets |
| Realized profit/loss | Gross returns − stakes for settled tickets |
| Balance including pending stakes | Available balance + pending stakes |
| Ticket win rate | Won tickets ÷ won and lost tickets |
| ROI | Realized profit/loss ÷ settled non-void stakes |

Pending and void tickets are excluded from the ticket win rate.

For historical team performance, wins, losses, and draws are calculated separately. When two supported clubs play each other, each club receives its own result in the statistics, while the fixture appears once in the results list.

### Charts

The simulator displays:

- Available bankroll over the sequence of simulation events.
- Cumulative realized profit or loss.
- Monthly counts of won and lost tickets.

Chart events appear in chronological order with equal spacing. Manual corrections recalculate results and may reduce a previously credited balance.

## Browser Profiles and Persistence

The application creates a random browser-profile ID after access is granted. Saved picks, tracked teams, and simulation history are associated with that ID.

- Different browsers or browser profiles maintain separate histories.
- People sharing the same browser profile share its data.
- Data is not synchronized between devices.
- No IP tracking or database is used.
- Clearing browser storage removes the saved profile and its history.

Browser storage is specific to the website origin. Local development and a deployed website therefore have separate data, as do localhost addresses using different ports.

Existing picks from the earlier storage format are migrated automatically. Original entries remain available as recovery backups.

## Access Control

The application includes a shared-code access screen that remembers successful access in a cookie for 30 days.

This is a frontend convenience gate, **not secure authentication**. The access check can be inspected or bypassed in the browser and does not protect the API endpoint.

Deployments requiring private access should enforce authentication and authorization on the server.

## API Configuration and Deployment

During local development, Vite forwards requests from:

```text
/api/football
```

to the football-data.org API and attaches the API key through the development proxy.

**Vite’s development proxy is not included in the production build.** A deployed application must provide an equivalent backend or serverless endpoint at `/api/football`.

Keep the API key on the server rather than exposing it through a `VITE_` environment variable.

### API Limitations

- Competition availability depends on the API subscription.
- Free-plan scores and schedule updates may be delayed.
- An uncached month requires six team requests.
- Fetching several months quickly may trigger rate limits.
- Missing or unconfirmed results remain unresolved.

Monthly fixture responses are cached in memory for 15 minutes. Explicit result refreshes bypass that cache.

## Development Commands

```bash
npm run dev      # Start the development server
npm test         # Run automated tests
npm run lint     # Check code quality
npm run build    # Generate the production build
npm run preview  # Preview the production build locally
```

The preview server does not provide the development API proxy.

## Testing

Automated tests cover:

- Stake validation and bankroll deductions.
- Gross returns and net profit calculations.
- Accumulator settlement and void selections.
- Protection against overspending.
- Repeated result refreshes.
- Independent monthly bankrolls.
- Manual result corrections.
- Currency rounding.
- Browser-profile isolation and legacy-pick migration.

Browser checks performed during development used mocked football fixtures. Live API behavior depends on the configured key, subscription coverage, and service availability.

## Purpose

This project provides a practical environment for exploring football results, recording selections, and evaluating simulated outcomes.

Historical performance and simulation results describe past observations; they do not establish the probability of future match outcomes.