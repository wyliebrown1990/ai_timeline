# AI Timeline

An interactive atlas and guided journey through the history of artificial intelligence—from Turing's foundations to GPT-4 and beyond.

## Features

- **Interactive Timeline**: Explore AI history with semantic zoom (decades → years → months)
- **Guided Path**: Start with Transformer → GPT-3 → ChatGPT → GPT-4
- **Primary Sources**: Every event backed by citations to original papers and documents
- **Concept Explorer**: Interactive definitions with prerequisites and related concepts
- **People & Labs**: Profiles of researchers and organizations that shaped AI

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Testing**: Playwright (E2E) + Jest (Unit)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/wyliebrown1990/ai_timeline.git
cd ai_timeline

# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install chromium
```

### Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration (optional for local dev)
```

### Development

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run Jest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run Playwright with UI |

## Project Structure

```
ai_timeline/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   ├── services/       # API and data services
│   ├── styles/         # Global styles
│   └── assets/         # Static assets
├── tests/
│   ├── e2e/            # Playwright E2E tests
│   └── unit/           # Jest unit tests
├── public/             # Static files
└── development-roadmap/ # Sprint documentation
```

## Development Roadmap

See the [Development Roadmap](./development-roadmap/ROADMAP-OVERVIEW.md) for sprint details.

## License

MIT
