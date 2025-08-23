import SwiftUI
import CoreLocation

struct ContentView: View {
    @StateObject private var locationManager = LocationManager()
    @State private var snakes: [Snake] = []
    private let service = SnakeService()

    var body: some View {
        NavigationView {
            Group {
                if let location = locationManager.location {
                    List(snakes) { snake in
                        HStack(alignment: .top) {
                            AsyncImage(url: snake.image) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Color.gray
                            }
                            .frame(width: 60, height: 60)
                            .clipped()

                            VStack(alignment: .leading) {
                                Text(snake.species)
                                    .font(.headline)
                                Text(snake.info)
                                    .font(.subheadline)
                            }
                        }
                    }
                    .navigationTitle("Nearby Snakes")
                    .onAppear {
                        snakes = service.snakes(near: location)
                    }
                } else {
                    VStack {
                        Text("We need your location to check for venomous snakes nearby.")
                            .multilineTextAlignment(.center)
                            .padding()
                        Button("Enable Location") {
                            locationManager.request()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .navigationTitle("SnakeMobile")
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
