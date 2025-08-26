# Kiro Steering Loader

A Visual Studio Code extension that helps you load steering agent templates into your Kiro projects.

## Features

- **Activity Bar Integration**: Access the extension from the VS Code activity bar
- **Template Management**: Browse and load steering templates from a configured directory
- **Automatic Directory Creation**: Creates `.kiro/steering/` directory structure automatically
- **Refresh Functionality**: Update the template list when new templates are added

## Usage

1. **Set Templates Path**: Settings>Extensions>Kiro Steering Loader.  Set to a local directory with steering templates.  Can also be set in the command palette as "Kiro Steering Loader: Set Templates Path", or by clicking the directory icon in the Kiro Loader view.
2. **Browse Templates**: Click the Kiro Steering icon in the activity bar to view available templates
3. **Load Templates**: Click on any template to load it into your current workspace's `.kiro/steering/` directory
4. **Refresh**: Use the refresh button to update the template list after adding new templates

## Configuration

- `kiroSteeringLoader.templatesPath`: Path to the directory containing your steering agent templates (`.md` files)

## Requirements

- Visual Studio Code 1.74.0 or higher
- A workspace folder must be open to load templates

## Installation

1. npm install -g vsce
2. Package the extension: `vsce package`
3. Install the generated `.vsix` file in VS Code

## Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. npm install -g vsce