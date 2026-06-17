#!/usr/bin/env ruby
# Adds the StreakWidget WidgetKit extension target to Runner.xcodeproj and
# wires the App Group entitlement onto the Runner app. Idempotent: re-running
# detects the existing target and exits without duplicating anything.
require 'xcodeproj'

PROJECT   = 'Runner.xcodeproj'
EXT_NAME  = 'StreakWidgetExtension'
EXT_DIR   = 'StreakWidget'
EXT_BUNDLE = 'com.heftor.heftor.StreakWidget'
APP_GROUP = 'group.com.heftor.heftor'
TEAM      = '76TN928G63'

project = Xcodeproj::Project.open(PROJECT)
runner  = project.targets.find { |t| t.name == 'Runner' }
raise 'Runner target not found' unless runner

if project.targets.any? { |t| t.name == EXT_NAME }
  puts "Target #{EXT_NAME} already exists — nothing to do."
  exit 0
end

# --- 1. Create the app-extension target ------------------------------------
ext = project.new_target(:app_extension, EXT_NAME, :ios, '14.0', nil, :swift)

# --- 2. Add the widget source + supporting files ---------------------------
group = project.main_group.find_subpath(EXT_DIR, true)
group.set_path(EXT_DIR)

# References are group-relative (the group already carries the EXT_DIR path).
swift_ref = group.new_reference('StreakWidget.swift')
ext.add_file_references([swift_ref])
# Info.plist + entitlements are referenced for visibility but not compiled.
group.new_reference('Info.plist')
group.new_reference('StreakWidget.entitlements')

# --- 3. Build settings for the extension -----------------------------------
ext.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = EXT_BUNDLE
  s['PRODUCT_NAME']              = '$(TARGET_NAME)'
  s['INFOPLIST_FILE']           = "#{EXT_DIR}/Info.plist"
  s['CODE_SIGN_ENTITLEMENTS']   = "#{EXT_DIR}/StreakWidget.entitlements"
  s['CODE_SIGN_STYLE']          = 'Automatic'
  s['DEVELOPMENT_TEAM']         = TEAM
  s['SWIFT_VERSION']            = '5.0'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0'
  s['TARGETED_DEVICE_FAMILY']   = '1,2'
  s['GENERATE_INFOPLIST_FILE']  = 'NO'
  s['CURRENT_PROJECT_VERSION']  = '1'
  s['MARKETING_VERSION']        = '1.0'
  s['SKIP_INSTALL']             = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS']  = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS'] = 'NO'
end

# --- 4. Embed the extension into the Runner app ----------------------------
embed = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
embed.name = 'Embed Foundation Extensions'
embed.symbol_dst_subfolder_spec = :plug_ins
# Must run BEFORE Flutter's "Thin Binary" / pods scripts, otherwise the build
# system reports a dependency cycle inside Runner. Insert it right after the
# "Embed Frameworks" phase.
embed_fw_idx = runner.build_phases.index { |ph| ph.display_name == 'Embed Frameworks' }
if embed_fw_idx
  runner.build_phases.insert(embed_fw_idx + 1, embed)
else
  runner.build_phases << embed
end
bf = embed.add_file_reference(ext.product_reference)
bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

# Make sure the app builds the extension before embedding it.
runner.add_dependency(ext)

# --- 5. App Group entitlement on the Runner app ----------------------------
# The existing Runner group already carries path "Runner", so the reference is
# group-relative.
runner_group = project.main_group['Runner']
runner_group.new_reference('Runner.entitlements') if runner_group
runner.build_configurations.each do |config|
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'Runner/Runner.entitlements'
end

project.save
puts "Added #{EXT_NAME} target, embedded it in Runner, and set App Group entitlements."
