import WidgetKit
import SwiftUI

// Must match the App Group configured on the Runner + this extension and the
// `HomeWidget.setAppGroupId` call on the Flutter side.
private let appGroupId = "group.com.heftor.heftor"

// Key written by the Flutter app via `HomeWidget.saveWidgetData('streak', ...)`.
private let streakKey = "streak"

struct StreakEntry: TimelineEntry {
    let date: Date
    let streak: Int
}

struct StreakProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), streak: 3)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        // The app force-refreshes the widget whenever the streak changes; this
        // timed reload is just a safety net so the value never goes stale.
        let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date()
        completion(Timeline(entries: [readEntry()], policy: .after(next)))
    }

    private func readEntry() -> StreakEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        let streak = defaults?.integer(forKey: streakKey) ?? 0
        return StreakEntry(date: Date(), streak: streak)
    }
}

struct StreakWidgetEntryView: View {
    var entry: StreakProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 5) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 14))
                    .foregroundColor(Color(red: 0.96, green: 0.65, blue: 0.14))
                Text("STREAK")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1.6)
                    .foregroundColor(.gray)
            }
            Spacer(minLength: 0)
            Text("\(entry.streak)")
                .font(.system(size: 52, weight: .black, design: .rounded))
                .foregroundColor(.white)
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            Text(entry.streak == 1 ? "week" : "weeks")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetContainer()
    }
}

private extension View {
    // iOS 17+ requires `containerBackground`; older systems paint the colour
    // behind the content directly.
    @ViewBuilder
    func widgetContainer() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.padding(16).containerBackground(.black, for: .widget)
        } else {
            self.padding(16).background(Color.black)
        }
    }
}

@main
struct StreakWidget: Widget {
    // This string is the WidgetKit "kind" — it must match the `iOSName`
    // passed to `HomeWidget.updateWidget` on the Flutter side.
    let kind: String = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Heftor Streak")
        .description("Your current weekly workout streak.")
        .supportedFamilies([.systemSmall])
    }
}
