import Foundation
import CoreLocation

final class SnakeService {
    private var snakes: [Snake] = []

    init() {
        loadSnakes()
    }

    private func loadSnakes() {
        guard let url = Bundle.main.url(forResource: "snakes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([Snake].self, from: data) else {
            return
        }
        snakes = decoded
    }

    func snakes(near location: CLLocation, radiusMiles: Double = 25) -> [Snake] {
        let radiusMeters = radiusMiles * 1609.34
        return snakes.filter { snake in
            let snakeLocation = CLLocation(latitude: snake.latitude, longitude: snake.longitude)
            return snakeLocation.distance(from: location) <= radiusMeters
        }
    }
}
