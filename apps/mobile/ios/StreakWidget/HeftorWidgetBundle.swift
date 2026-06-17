import WidgetKit
import SwiftUI

// Hosts every Heftor home-screen widget. Adding a new widget = add it here.
@main
struct HeftorWidgetBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        StreakWidget()
        MonthWidget()
    }
}
