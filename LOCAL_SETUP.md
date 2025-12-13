# Local Development Setup Guide

## Prerequisites

To test your Jekyll site locally, you need:

1. **Ruby** (for Jekyll)
2. **Jekyll** (static site generator)
3. **Node.js and npm** (already installed ✓)

## Option 1: Install Ruby and Jekyll on Windows (Recommended)

### Step 1: Install Ruby
1. Download RubyInstaller from: https://rubyinstaller.org/downloads/
2. Download **Ruby+Devkit 3.1.x** (or latest stable version)
3. Run the installer and check "Add Ruby executables to your PATH"
4. After installation, a new terminal will open - run the `ridk install` command when prompted

### Step 2: Install Jekyll
Open a new terminal and run:
```powershell
gem install jekyll bundler
```

### Step 3: Install Jekyll Dependencies
Create a `Gemfile` in your project root (if it doesn't exist):
```ruby
source "https://rubygems.org"
gem "jekyll", "~> 4.3"
```

Then run:
```powershell
bundle install
```

### Step 4: Install Node Dependencies
```powershell
npm install
```

### Step 5: Run the Development Server

**Option A: Using Gulp (includes live reload)**
```powershell
npm run dev
```

**Option B: Using Jekyll directly**
```powershell
bundle exec jekyll serve
```
Then open http://localhost:4000 in your browser

## Option 2: Using Docker (Alternative)

If you have Docker installed:

```powershell
docker run --rm -it -v ${PWD}:/srv/jekyll -p 4000:4000 jekyll/jekyll:latest jekyll serve
```

## Option 3: Using GitHub Codespaces (Cloud-based)

1. Push your code to GitHub
2. Open your repository on GitHub
3. Click "Code" → "Codespaces" → "Create codespace"
4. In the terminal, run: `npm run dev` or `bundle exec jekyll serve`

## Troubleshooting

### node-sass build errors
The project uses deprecated `node-sass`. If you encounter build errors, you can:
- Ignore the warnings (they're just deprecation notices)
- Or update `gulp-sass` to use `sass` instead (requires code changes)

### Jekyll not found
Make sure Ruby is in your PATH. Restart your terminal after installing Ruby.

### Port already in use
If port 4000 is busy, use a different port:
```powershell
bundle exec jekyll serve --port 4001
```

## Quick Start (Once Everything is Installed)

```powershell
# Install dependencies (one time)
npm install
bundle install

# Start development server
npm run dev
# OR
bundle exec jekyll serve
```

Visit http://localhost:4000 to see your site!
