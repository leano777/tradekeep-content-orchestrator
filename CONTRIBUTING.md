# 🤝 Contributing to TradeKeep Content Orchestrator

We're thrilled that you're interested in contributing to the TradeKeep Content Orchestrator! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Brand Guidelines](#brand-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inspiring community for all.

### Our Standards

- **Be respectful** and inclusive in your communication
- **Be collaborative** and help others learn and grow
- **Be professional** in all interactions
- **Focus on constructive feedback** and solutions
- **Respect different viewpoints** and experiences

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 14.0 or higher
- **Git** for version control
- **GitHub account** for collaboration

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tradekeep-content-orchestrator.git
   cd tradekeep-content-orchestrator
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/tradekeep/tradekeep-content-orchestrator.git
   ```

4. **Install dependencies**:
   ```bash
   npm run install:all
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

6. **Set up database**:
   ```bash
   cd server
   npx prisma migrate dev
   npm run db:seed
   ```

7. **Start development servers**:
   ```bash
   npm run dev
   ```

## 🔄 Development Workflow

### Branch Naming Convention

Use descriptive branch names following this pattern:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

**Examples:**
- `feature/content-calendar-drag-drop`
- `fix/email-campaign-validation`
- `docs/api-endpoint-documentation`

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   npm run test
   npm run type-check
   npm run lint
   ```

4. **Commit your changes** using conventional commits

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## 💻 Coding Standards

### TypeScript Guidelines

- **Use strict TypeScript** - Enable strict mode in tsconfig.json
- **Define proper types** - Avoid `any`, use specific types
- **Use interfaces** for object shapes
- **Export types** from dedicated type files

```typescript
// ✅ Good
interface ContentItem {
  id: string;
  title: string;
  status: ContentStatus;
  createdAt: Date;
}

// ❌ Avoid
const item: any = {};
```

### React Guidelines

- **Use functional components** with hooks
- **Follow hooks rules** - only call hooks at the top level
- **Use meaningful component names** - PascalCase for components
- **Keep components focused** - single responsibility principle

```tsx
// ✅ Good
const ContentCalendar: React.FC<ContentCalendarProps> = ({ items }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  return (
    <div className="content-calendar">
      {/* Component content */}
    </div>
  );
};

// ❌ Avoid
const component = () => { /* ... */ };
```

### CSS/Tailwind Guidelines

- **Use Tailwind classes** for styling
- **Follow mobile-first** approach
- **Use semantic class names** for custom CSS
- **Maintain design system consistency**

```tsx
// ✅ Good
<button className="btn btn-primary">
  Save Content
</button>

// Use custom classes for complex patterns
<div className="content-calendar-day today has-content">
  {/* Content */}
</div>
```

### File Organization

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── forms/           # Form-specific components
│   ├── layout/          # Layout components
│   └── dashboard/       # Feature-specific components
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
├── store/               # Global state management
└── styles/              # Global styles and themes
```

## 🎨 Brand Guidelines

### TradeKeep Brand Pillars

Every feature should align with one or more of TradeKeep's brand pillars:

1. **🧠 Internal Operating System** - Systematic, process-focused
2. **🔬 Psychology Over Strategy** - Psychology-aware, empathetic
3. **⚡ Discipline Over Dopamine** - Long-term focused, consistent
4. **🎯 Systems vs Reactive Trading** - Professional, methodical

### Design Consistency

- **Use brand colors** defined in the Tailwind config
- **Follow typography** guidelines (Inter font family)
- **Maintain spacing** consistency using Tailwind spacing scale
- **Use consistent icons** from Heroicons or Lucide

### Content Voice

- **Be authoritative** but not condescending
- **Focus on psychology** over technical details
- **Use contrarian insights** to challenge assumptions
- **Emphasize discipline** and systematic thinking

## 📝 Commit Messages

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only changes
- `style` - Changes that don't affect meaning (formatting, etc.)
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `test` - Adding missing tests or correcting existing tests
- `chore` - Changes to build process or auxiliary tools

### Examples

```bash
feat(calendar): add drag-and-drop content scheduling

fix(auth): resolve token expiration handling

docs(api): update endpoint documentation for campaigns

refactor(components): extract reusable button component

test(content): add unit tests for content validation
```

## 🔍 Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Run all tests** and ensure they pass
4. **Check linting** and fix any issues
5. **Update CHANGELOG** if applicable

### PR Template

When creating a PR, include:

- **Clear description** of changes
- **Related issue(s)** using `Closes #123`
- **Screenshots** for UI changes
- **Breaking changes** if any
- **Testing instructions**

### Review Process

1. **Automated checks** must pass (tests, linting, type checking)
2. **Code review** by maintainers
3. **Manual testing** if UI/UX changes
4. **Documentation review** if applicable
5. **Approval** from at least one maintainer

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template and include:
- **Clear description** of the issue
- **Steps to reproduce** the bug
- **Expected vs actual** behavior
- **Environment details** (OS, browser, versions)
- **Screenshots** if applicable

### Feature Requests

Use the feature request template and include:
- **Problem statement** - what problem does this solve?
- **Proposed solution** - how should it work?
- **Brand pillar alignment** - which pillars does it support?
- **User journey** - how will users interact with it?
- **Success metrics** - how will we measure success?

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test content.test.ts
```

### Writing Tests

- **Unit tests** for utility functions and hooks
- **Integration tests** for API endpoints
- **Component tests** for React components
- **E2E tests** for critical user flows

```typescript
// Example component test
import { render, screen } from '@testing-library/react';
import { ContentCalendar } from './ContentCalendar';

describe('ContentCalendar', () => {
  it('renders calendar with current month', () => {
    render(<ContentCalendar />);
    expect(screen.getByText(/January 2024/)).toBeInTheDocument();
  });
});
```

## 📚 Documentation

### API Documentation

- **Document all endpoints** with clear examples
- **Include request/response** schemas
- **Specify authentication** requirements
- **List possible error codes**

### Component Documentation

- **Use JSDoc comments** for component props
- **Include usage examples**
- **Document accessibility features**
- **Explain complex logic**

```typescript
/**
 * ContentCalendar displays a monthly calendar view with content scheduling
 * @param items - Array of content items to display
 * @param onDateSelect - Callback when a date is selected
 * @param selectedDate - Currently selected date
 */
interface ContentCalendarProps {
  items: ContentItem[];
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}
```

## 🏆 Recognition

Contributors who make significant contributions will be:
- **Listed in CONTRIBUTORS.md**
- **Mentioned in release notes**
- **Invited to join** the core team (for regular contributors)

## ❓ Questions?

If you have questions about contributing:
- **Create a discussion** on GitHub
- **Join our community** (link to be added)
- **Review existing issues** and PRs
- **Check the documentation** first

## 🎉 Thank You!

Thank you for contributing to TradeKeep Content Orchestrator! Your efforts help us build better tools for disciplined content creation and brand consistency.

---

*This contributing guide is a living document and may be updated as the project evolves.*