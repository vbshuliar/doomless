# Cactus React Native Installation

The `cactus-react-native` package may need to be installed manually or from a different source. Here are the options:

## Option 1: Install from npm (if available)

Try installing directly:
```bash
npm install cactus-react-native
```

## Option 2: Install from GitHub

If npm doesn't work, try installing from the GitHub repository:
```bash
npm install https://github.com/cactuscompute/cactus-react-native.git
```

Or add to package.json:
```json
"cactus-react-native": "git+https://github.com/cactuscompute/cactus-react-native.git"
```

## Option 3: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/cactuscompute/cactus-react-native.git
```

2. Copy the package to your node_modules or link it

## Check Installation

After installation, verify it works:
```bash
npm list cactus-react-native
```

## Note

The package might also require `react-native-nitro-modules` as a peer dependency. Check the Cactus documentation for the latest installation instructions:
https://cactuscompute.com/docs/react-native

## For Now

Since the core functionality can work without Cactus initially (you can test the UI and database), you can:
1. Install the other packages first: `npm install`
2. Add Cactus later when you have the correct installation method
3. The app will show an error if Cactus isn't installed, but you can still test the UI structure

