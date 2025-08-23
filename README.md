# SnakeMobile

SnakeMobile is a very simple iOS application that lists venomous snakes that may be present near your current location. After granting location access the app shows nearby species with an image and a short medical note.

The example uses a small JSON file derived from the [VenomMaps](https://github.com/RhettRautsaw/VenomMaps) occurrence dataset. In a production app you could replace this file by downloading and parsing the full dataset.

## Building

Open the package in Xcode 15 or later and run the *SnakeMobile* target on an iOS device or simulator. The package requires iOS 16 or later.

## Notes

This project was created in a Linux environment, so building the iOS application was not possible here. Use a macOS environment with Xcode to compile and run the app.
