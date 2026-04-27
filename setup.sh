#!/bin/sh
# Run this once after cloning: sh setup.sh
echo "Setting up git hooks..."
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "✓ Pre-commit hook installed"
echo ""
echo "Available commands:"
echo "  cd backend && npm run security   — run security scan"
echo "  cd backend && npm test           — run all tests"
echo "  cd backend && npm run build      — type-check + build"
