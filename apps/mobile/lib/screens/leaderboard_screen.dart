import 'package:flutter/material.dart';
import '../i18n/app_strings.dart';
import '../models/rank.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

enum LeaderboardScope { global, country, rank, weekly }

extension _ScopeX on LeaderboardScope {
  String get apiKey => switch (this) {
        LeaderboardScope.global => 'global',
        LeaderboardScope.country => 'country',
        LeaderboardScope.rank => 'rank',
        LeaderboardScope.weekly => 'weekly',
      };

  String get label => switch (this) {
        LeaderboardScope.global => t('leaderboard.scope_global'),
        LeaderboardScope.country => t('leaderboard.scope_country'),
        LeaderboardScope.rank => t('leaderboard.scope_rank'),
        LeaderboardScope.weekly => t('leaderboard.scope_weekly'),
      };
}

class _LbEntry {
  final String userId;
  final String username;
  final int xp;
  final RankDef rank;
  final int position;
  final bool isMe;

  const _LbEntry({
    required this.userId,
    required this.username,
    required this.xp,
    required this.rank,
    required this.position,
    required this.isMe,
  });

  factory _LbEntry.fromJson(Map<String, dynamic> json) => _LbEntry(
        userId: json['userId'] as String,
        username: json['username'] as String? ?? t('leaderboard.athlete_fallback'),
        xp: (json['xp'] as num?)?.toInt() ?? 0,
        rank: RankDef.fromJson(
          (json['rank'] as Map).cast<String, dynamic>(),
        ),
        position: (json['position'] as num?)?.toInt() ?? 0,
        isMe: json['isMe'] as bool? ?? false,
      );
}

class LeaderboardScreen extends StatefulWidget {
  final AuthService auth;
  final LeaderboardScope initialScope;

  const LeaderboardScreen({
    super.key,
    required this.auth,
    this.initialScope = LeaderboardScope.global,
  });

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  late LeaderboardScope _scope = widget.initialScope;
  final ScrollController _scrollController = ScrollController();

  List<_LbEntry> _entries = [];
  _LbEntry? _own;
  int _page = 0;
  bool _hasMore = true;
  bool _loadingFirst = true;
  bool _loadingMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadInitial();
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_loadingMore || !_hasMore) return;
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 240) {
      _loadMore();
    }
  }

  void _switchScope(LeaderboardScope s) {
    if (s == _scope) return;
    setState(() {
      _scope = s;
      _entries = [];
      _own = null;
      _page = 0;
      _hasMore = true;
      _loadingFirst = true;
      _error = null;
    });
    _loadInitial();
  }

  Future<void> _loadInitial() async {
    try {
      final data =
          await widget.auth.getLeaderboard(scope: _scope.apiKey, page: 0);
      if (!mounted) return;
      final results = ((data['results'] as List?) ?? const [])
          .map((e) => _LbEntry.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
      final own = data['ownPosition'] is Map
          ? _LbEntry.fromJson(
              (data['ownPosition'] as Map).cast<String, dynamic>(),
            )
          : null;
      setState(() {
        _entries = results;
        _own = own;
        _hasMore = data['hasMore'] as bool? ?? false;
        _page = 0;
        _loadingFirst = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = t('leaderboard.load_failed');
        _loadingFirst = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final next = _page + 1;
      final data =
          await widget.auth.getLeaderboard(scope: _scope.apiKey, page: next);
      if (!mounted) return;
      final more = ((data['results'] as List?) ?? const [])
          .map((e) => _LbEntry.fromJson((e as Map).cast<String, dynamic>()))
          .toList();
      setState(() {
        _entries.addAll(more);
        _hasMore = data['hasMore'] as bool? ?? false;
        _page = next;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
    }
  }

  bool get _ownInLoaded =>
      _own != null && _entries.any((e) => e.userId == _own!.userId);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: AppColors.onSurface),
        title: const SizedBox.shrink(),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                t('leaderboard.title'),
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -1,
                  color: AppColors.onSurface,
                ),
              ),
            ),
          ),
          _scopeStrip(),
          const SizedBox(height: 12),
          Expanded(child: _body()),
          // Sticky "TE" footer when own row isn't in the loaded slice.
          if (!_loadingFirst &&
              _error == null &&
              _own != null &&
              !_ownInLoaded)
            _StickyOwnRow(entry: _own!),
        ],
      ),
    );
  }

  Widget _scopeStrip() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: LeaderboardScope.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final s = LeaderboardScope.values[i];
          final active = s == _scope;
          return GestureDetector(
            onTap: () => _switchScope(s),
            behavior: HitTestBehavior.opaque,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 140),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: active ? AppColors.primary : AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                s.label,
                style: TextStyle(
                  fontSize: 12,
                  letterSpacing: 1.4,
                  fontWeight: FontWeight.w800,
                  color: active ? AppColors.background : AppColors.onSurface,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _body() {
    if (_loadingFirst) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Text(
            _error!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted),
          ),
        ),
      );
    }
    if (_entries.isEmpty) {
      return _emptyState();
    }
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      itemCount: _itemCount(),
      itemBuilder: _buildItem,
    );
  }

  Widget _emptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Text(
          _scope == LeaderboardScope.country
              ? t('leaderboard.empty_country')
              : t('leaderboard.empty_general'),
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.muted, fontSize: 14),
        ),
      ),
    );
  }

  int _itemCount() {
    var n = 0;
    n += 1; // podium
    final restStart = 3;
    final restEntries =
        _entries.length > restStart ? _entries.length - restStart : 0;
    n += restEntries;
    if (_loadingMore) n += 1;
    return n;
  }

  Widget _buildItem(BuildContext context, int index) {
    if (index == 0) return _podiumSection();
    final restStart = 3;
    final adjusted = index - 1 + restStart; // map back to entries
    if (adjusted >= _entries.length) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Center(
          child: SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.muted,
            ),
          ),
        ),
      );
    }
    return _LbRow(entry: _entries[adjusted]);
  }

  Widget _podiumSection() {
    final top1 = _entries.isNotEmpty ? _entries[0] : null;
    final top2 = _entries.length > 1 ? _entries[1] : null;
    final top3 = _entries.length > 2 ? _entries[2] : null;
    if (top1 == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        children: [
          // Names + numerals row.
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(child: _PodiumHead(entry: top2, height: 92, place: 2)),
              const SizedBox(width: 8),
              Expanded(child: _PodiumHead(entry: top1, height: 124, place: 1)),
              const SizedBox(width: 8),
              Expanded(child: _PodiumHead(entry: top3, height: 72, place: 3)),
            ],
          ),
          const SizedBox(height: 16),
          // Visible podium bars below.
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(child: _PodiumBar(height: 56, fill: 0.4, label: '2')),
              const SizedBox(width: 8),
              Expanded(child: _PodiumBar(height: 84, fill: 1, label: '1')),
              const SizedBox(width: 8),
              Expanded(child: _PodiumBar(height: 40, fill: 0.2, label: '3')),
            ],
          ),
          const SizedBox(height: 24),
          Container(height: 1, color: AppColors.outline),
        ],
      ),
    );
  }
}

/// Top of the podium — username + Roman numeral + XP. `height` controls the
/// vertical space taken so 1st-place visually sits taller than 2nd/3rd.
class _PodiumHead extends StatelessWidget {
  final _LbEntry? entry;
  final double height;
  final int place;
  const _PodiumHead({
    required this.entry,
    required this.height,
    required this.place,
  });

  @override
  Widget build(BuildContext context) {
    if (entry == null) {
      return SizedBox(
        height: height,
        child: const Center(
          child: Text('—',
              style: TextStyle(fontSize: 28, color: AppColors.muted)),
        ),
      );
    }
    final e = entry!;
    return SizedBox(
      height: height,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text(
            e.rank.numeral,
            style: TextStyle(
              fontSize: place == 1 ? 44 : 32,
              fontWeight: FontWeight.w800,
              height: 1,
              letterSpacing: -1,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            e.username,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: place == 1 ? 13 : 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: e.isMe ? AppColors.onSurface : AppColors.muted,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${_formatXp(e.xp)} XP',
            style: const TextStyle(
              fontSize: 10,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w700,
              color: AppColors.muted,
            ),
          ),
        ],
      ),
    );
  }
}

/// The actual podium box — 3 monochrome blocks of differing heights.
class _PodiumBar extends StatelessWidget {
  final double height;
  final double fill; // 0..1 — how solid the box looks
  final String label;
  const _PodiumBar({
    required this.height,
    required this.fill,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      alignment: Alignment.topCenter,
      decoration: BoxDecoration(
        color: Color.lerp(AppColors.surfaceLow, AppColors.onSurface, fill * 0.85),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
      ),
      child: Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
            color: fill > 0.5 ? AppColors.background : AppColors.onSurface,
          ),
        ),
      ),
    );
  }
}

class _LbRow extends StatelessWidget {
  final _LbEntry entry;
  const _LbRow({required this.entry});

  @override
  Widget build(BuildContext context) {
    final isMe = entry.isMe;
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isMe ? AppColors.onSurface : Colors.transparent,
        border: !isMe
            ? const Border(
                bottom: BorderSide(color: AppColors.outline, width: 1),
              )
            : null,
        borderRadius: isMe ? BorderRadius.circular(12) : BorderRadius.zero,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 36,
            child: Text(
              '${entry.position}',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: isMe ? AppColors.background : AppColors.muted,
              ),
            ),
          ),
          Expanded(
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    entry.username,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isMe ? AppColors.background : AppColors.onSurface,
                    ),
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 6),
                  Text(
                    t('leaderboard.you_tag'),
                    style: TextStyle(
                      fontSize: 10,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w800,
                      color: AppColors.background.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            entry.rank.numeral,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
              color: isMe ? AppColors.background : AppColors.muted,
            ),
          ),
          const SizedBox(width: 14),
          Text(
            _formatXp(entry.xp),
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
              color: isMe ? AppColors.background : AppColors.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

class _StickyOwnRow extends StatelessWidget {
  final _LbEntry entry;
  const _StickyOwnRow({required this.entry});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(top: BorderSide(color: AppColors.surfaceHigh)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(
                t('leaderboard.you_on_list'),
                style: const TextStyle(
                  fontSize: 10,
                  letterSpacing: 1.6,
                  fontWeight: FontWeight.w800,
                  color: AppColors.muted,
                ),
              ),
            ),
            _LbRow(entry: entry),
          ],
        ),
      ),
    );
  }
}

String _formatXp(int xp) {
  if (xp >= 1000) {
    final v = xp / 1000;
    return '${v.toStringAsFixed(v >= 10 ? 0 : 1).replaceAll('.', ',')}K';
  }
  return xp.toString();
}
