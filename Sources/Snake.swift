import Foundation

struct Snake: Identifiable, Decodable {
    let id = UUID()
    let species: String
    let latitude: Double
    let longitude: Double
    let image: URL
    let info: String
}
