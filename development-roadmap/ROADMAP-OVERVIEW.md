# AI Timeline - Development Roadmap

## Project Overview

**AI Timeline** is a web application for tracking and visualizing AI development milestones throughout history. This roadmap outlines the sprint-based development plan to build a fully functional, tested, and deployed application.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + TypeScript |
| **Styling** | Tailwind CSS |
| **State Management** | React Context / Zustand |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Testing** | Playwright (E2E) + Jest (Unit) |
| **Build Tool** | Vite |
| **Deployment** | Vercel / Railway |

---

## Sprint Overview

| Sprint | Focus Area | Status |
|--------|------------|--------|
| [Sprint 1](./sprint-01-project-setup.md) | Project Setup & Foundation | [ ] Not Started |
| [Sprint 2](./sprint-02-data-layer.md) | Data Layer & Models | [ ] Not Started |
| [Sprint 3](./sprint-03-timeline-ui.md) | Timeline UI Foundation | [ ] Not Started |
| [Sprint 4](./sprint-04-interactive-features.md) | Interactive Timeline Features | [ ] Not Started |
| [Sprint 5](./sprint-05-data-management.md) | Data Management Interface | [ ] Not Started |
| [Sprint 6](./sprint-06-search-filtering.md) | Search & Filtering | [ ] Not Started |
| [Sprint 7](./sprint-07-polish-accessibility.md) | Polish & Accessibility | [ ] Not Started |
| [Sprint 8](./sprint-08-deployment.md) | Deployment & Launch | [ ] Not Started |

---

## Testing Strategy

### Playwright E2E Testing

Every sprint includes Playwright tests with automated screenshot capture for visual regression testing.

```
tests/
├── e2e/
│   ├── screenshots/           # Baseline screenshots
│   │   ├── sprint-01/
│   │   ├── sprint-02/
│   │   └── ...
│   ├── sprint-01/
│   │   └── *.spec.ts
│   ├── sprint-02/
│   │   └── *.spec.ts
│   └── ...
├── unit/
│   └── ...
└── playwright.config.ts
```

### Screenshot Testing Workflow

1. **Capture**: Playwright captures screenshots at key UI states
2. **Baseline**: First run establishes baseline images
3. **Compare**: Subsequent runs compare against baselines
4. **Review**: Visual diffs highlight unintended changes
5. **Update**: Approved changes update baselines

---

## Definition of Done

Each sprint task is considered complete when:

- [ ] Code is implemented and reviewed
- [ ] Unit tests pass (where applicable)
- [ ] Playwright E2E tests pass
- [ ] Screenshots captured and baselined
- [ ] Documentation updated
- [ ] Code merged to main branch

---

## Progress Tracking

Update checkboxes in each sprint document as tasks are completed. Use the following status markers:

- `[ ]` - Not started
- `[x]` - Completed
- `[~]` - In progress (optional)
- `[!]` - Blocked (optional)

---

## Quick Links

- [Sprint 1: Project Setup](./sprint-01-project-setup.md)
- [Sprint 2: Data Layer](./sprint-02-data-layer.md)
- [Sprint 3: Timeline UI](./sprint-03-timeline-ui.md)
- [Sprint 4: Interactive Features](./sprint-04-interactive-features.md)
- [Sprint 5: Data Management](./sprint-05-data-management.md)
- [Sprint 6: Search & Filtering](./sprint-06-search-filtering.md)
- [Sprint 7: Polish & Accessibility](./sprint-07-polish-accessibility.md)
- [Sprint 8: Deployment](./sprint-08-deployment.md)

---

## Getting Started

To begin development, start with **Sprint 1** and work through each sprint sequentially. Each sprint builds upon the previous one's foundation.

```bash
# Clone and start
git clone <repository-url>
cd ai_timeline
npm install
npm run dev
```
