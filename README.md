# Recursive ZIP Unzipper

A client-side recursive ZIP unzipper built with Next.js that automatically extracts nested ZIP files into a flat folder structure. All processing happens in your browser - no server uploads required.

## Features

- **🔒 Client-side only**: Files never leave your browser - complete privacy
- **🔄 Recursive extraction**: Automatically detects and extracts nested ZIP files
- **📁 Flat structure**: Converts nested ZIP archives into an organized flat folder structure
- **💾 Individual downloads**: Download any extracted file individually
- **📦 Bulk download**: Re-package all extracted files into a single ZIP
- **🖱️ Drag & drop**: Simple drag-and-drop interface or file picker
- **⚡ Modern tech**: Built with Next.js 15, React 19, TypeScript, and Tailwind CSS
- **🎨 Clean UI**: Modern interface with shadcn/ui components

## How It Works

1. **Upload**: Drag and drop a ZIP file or use the file picker
2. **Extract**: The app recursively extracts all ZIP files (including nested ones)
3. **Browse**: View all extracted files in a clean list with file sizes
4. **Download**: Download individual files or re-package everything as a new ZIP

### Supported Compression Methods

- **Store** (method 0): Uncompressed files
- **Deflate** (method 8): Standard ZIP compression using Web APIs

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/vinhddinh/unzip.git
cd unzip

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

### Available Scripts

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production with Turbopack
npm start        # Start production server
npm run lint     # Run ESLint
```

## Docker Support

Deploy with Docker for production:

```bash
# Build the production image
docker build -t unzip-app .

# Run the container
docker run --rm -p 3000:3000 unzip-app

# Access the application
open http://localhost:3000  # macOS
# xdg-open http://localhost:3000  # Linux
```

**Docker Details:**

- Multi-stage build (builder → runner) for optimized image size
- Production dependencies only in final image
- Runs on port 3000 with `next start`
- Rebuild image after dependency changes

## Technical Details

### Architecture

- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **ZIP Processing**: Custom implementation using Web APIs
  - `DecompressionStream` for deflate decompression
  - `DataView` for binary ZIP structure parsing
  - Recursive extraction with configurable folder naming

### Core Components

- **`ZipUnzipper`**: Main UI component handling file upload and display
- **`unzip.ts`**: Core ZIP parsing and extraction logic
- **`zip.ts`**: ZIP creation for bulk downloads
- **UI Components**: Modern components using Radix UI primitives

### Browser Compatibility

Requires modern browsers supporting:

- `DecompressionStream` (Chrome 80+, Firefox 65+, Safari 16.4+)
- `File` and `ArrayBuffer` APIs
- ES2020+ features

## Use Cases

- **Archive Management**: Extract complex nested ZIP structures
- **File Recovery**: Access files from corrupted or nested archives
- **Privacy-focused**: Process sensitive archives without server upload
- **Development**: Extract project archives with nested dependencies
- **Research**: Analyze archive structures and contents

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vinhddinh/unzip)

### Other Platforms

This Next.js app can be deployed on any platform supporting Node.js:

- Netlify
- Railway
- Digital Ocean
- AWS Amplify

See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for platform-specific guides.

---

**Note**: This tool processes files entirely in your browser for maximum privacy and security. No files are uploaded to any server.
