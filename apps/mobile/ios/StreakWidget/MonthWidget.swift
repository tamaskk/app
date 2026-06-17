import WidgetKit
import SwiftUI

// Same App Group as the Runner app + the other widget.
private let appGroupId = "group.com.heftor.heftor"

// Keys written by the Flutter app via HomeWidget.saveWidgetData.
private let monthKeyKey = "month_key"   // "YYYY-M" the trained-days belong to
private let monthDaysKey = "month_days" // CSV of trained day numbers (1...31)
private let weekDoneKey = "week_done"   // workouts completed this week
private let weekGoalKey = "week_goal"   // target workouts/week (daysPerWeek)

struct MonthEntry: TimelineEntry {
    let date: Date
    let trainedDays: Set<Int>
    // True only when the stored data matches the month being rendered, so a
    // stale set never mis-marks days after the month rolls over.
    let dataIsForThisMonth: Bool
    let weekDone: Int
    let weekGoal: Int
}

struct MonthProvider: TimelineProvider {
    func placeholder(in context: Context) -> MonthEntry {
        MonthEntry(date: Date(), trainedDays: [2, 4, 5, 9, 11, 16, 18, 23, 25],
                   dataIsForThisMonth: true, weekDone: 2, weekGoal: 4)
    }

    func getSnapshot(in context: Context, completion: @escaping (MonthEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MonthEntry>) -> Void) {
        let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date()
        completion(Timeline(entries: [readEntry()], policy: .after(next)))
    }

    private func readEntry() -> MonthEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        let now = Date()
        let cal = Calendar.current
        let currentKey = "\(cal.component(.year, from: now))-\(cal.component(.month, from: now))"
        let storedKey = defaults?.string(forKey: monthKeyKey) ?? ""
        let csv = defaults?.string(forKey: monthDaysKey) ?? ""
        let days = Set(csv.split(separator: ",").compactMap { Int($0) })
        return MonthEntry(date: now, trainedDays: days,
                          dataIsForThisMonth: storedKey == currentKey,
                          weekDone: defaults?.integer(forKey: weekDoneKey) ?? 0,
                          weekGoal: defaults?.integer(forKey: weekGoalKey) ?? 0)
    }
}

struct MonthWidgetEntryView: View {
    var entry: MonthProvider.Entry

    // App palette.
    private let trainedColor = Color.white
    private let missedColor = Color(white: 0.22)
    private let todayColor = Color(red: 1.0, green: 0.23, blue: 0.19)
    private let goalHitColor = Color(red: 0.20, green: 0.78, blue: 0.35)

    var body: some View {
        let cal = Calendar(identifier: .gregorian)
        let now = entry.date
        let monthComps = cal.dateComponents([.year, .month], from: now)
        let firstOfMonth = cal.date(from: monthComps) ?? now
        let numDays = cal.range(of: .day, in: .month, for: now)?.count ?? 30
        let today = cal.component(.day, from: now)
        // Monday-first leading offset (the app treats Monday as week start).
        let weekdaySunFirst = cal.component(.weekday, from: firstOfMonth) // 1=Sun
        let leading = (weekdaySunFirst + 5) % 7                            // Mon=0
        let totalCells = leading + numDays
        let rows = Int(ceil(Double(totalCells) / 7.0))

        VStack(alignment: .leading, spacing: 10) {
            header(month: cal.component(.month, from: now))
            GeometryReader { geo in
                let gap: CGFloat = 8
                let dot = min(
                    (geo.size.width - gap * 6) / 7,
                    (geo.size.height - gap * CGFloat(max(rows - 1, 1))) / CGFloat(rows)
                )
                VStack(spacing: gap) {
                    ForEach(0..<rows, id: \.self) { row in
                        HStack(spacing: gap) {
                            ForEach(0..<7, id: \.self) { col in
                                let day = row * 7 + col - leading + 1
                                Circle()
                                    .fill(color(for: day, today: today, numDays: numDays))
                                    .frame(width: dot, height: dot)
                            }
                        }
                    }
                }
                .frame(width: geo.size.width, height: geo.size.height)
            }
        }
        .padding(16)
        .monthWidgetBackground()
    }

    // Month name on the left, "THIS WEEK  done/goal" tally on the right.
    private func header(month: Int) -> some View {
        let df = DateFormatter()
        df.locale = Locale.current
        let names = df.standaloneMonthSymbols ?? []
        let monthName = (month >= 1 && month <= names.count
            ? names[month - 1] : "").uppercased()
        let goalHit = entry.weekGoal > 0 && entry.weekDone >= entry.weekGoal
        return HStack(alignment: .firstTextBaseline) {
            Text(monthName)
                .font(.system(size: 12, weight: .heavy))
                .tracking(1.4)
                .foregroundColor(Color(white: 0.55))
            Spacer()
            HStack(spacing: 5) {
                Text("THIS WEEK")
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(1.2)
                    .foregroundColor(Color(white: 0.45))
                Text(entry.weekGoal > 0 ? "\(entry.weekDone)/\(entry.weekGoal)" : "\(entry.weekDone)")
                    .font(.system(size: 15, weight: .black))
                    .foregroundColor(goalHit ? goalHitColor : .white)
            }
        }
    }

    private func color(for day: Int, today: Int, numDays: Int) -> Color {
        guard day >= 1 && day <= numDays else { return .clear } // padding cells
        if entry.dataIsForThisMonth && day == today { return todayColor }
        if entry.dataIsForThisMonth && entry.trainedDays.contains(day) { return trainedColor }
        return missedColor
    }
}

private extension View {
    @ViewBuilder
    func monthWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(.black, for: .widget)
        } else {
            self.background(Color.black)
        }
    }
}

struct MonthWidget: Widget {
    // Must match the `iOSName` passed to HomeWidget.updateWidget on Flutter side.
    let kind: String = "MonthWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MonthProvider()) { entry in
            MonthWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Heftor Month")
        .description("Your training days this month — bright = trained, red = today.")
        .supportedFamilies([.systemMedium])
    }
}
