// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "SnakeMobile",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "SnakeMobile",
            targets: ["SnakeMobile"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "SnakeMobile",
            path: "Sources",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
