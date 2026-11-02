import { motionValue } from 'framer-motion';
import { Music2, Pause, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProgressBar from '../../ProgressBar';
import { PlayerState } from '../../../types';
import { getPlaybackSongKey } from '../../../utils/appPlaybackGuards';
import { useLatticeTransport } from './LatticeTransportContext';
import type { LatticeSongTile } from './latticeModel';
import LatticeChromeTime from './LatticeChromeTime';
import LatticeExtraControls from './LatticeExtraControls';
import { resolvePlayerControlSlot } from '../../floating-player/playerControlSlotActions';
import { useLatticePlaybackActions } from './LatticePlaybackProvider';
import './LatticeChrome.css';

// Adapts the shared Player Chrome transport and progress bar to one expanded wall tile.

type LatticePlaybackControlsProps = {
    revealed: boolean;
    tile: LatticeSongTile;
    onPlay: (tile: LatticeSongTile) => void;
    onTogglePlayback: () => void;
    onSeek: (time: number) => void;
    onOpenPlayer: () => void;
};

const idleTime = motionValue(0);
const ignoreSeek = () => { };

export default function LatticePlaybackControls({
    revealed,
    tile,
    onPlay,
    onTogglePlayback,
    onSeek,
    onOpenPlayer,
}: LatticePlaybackControlsProps) {
    const { t } = useTranslation();
    // Subscribed here rather than threaded through every poster: only this card reads transport state.
    const { currentSong, playerState, currentTime, playbackDuration, canTogglePlayback } = useLatticeTransport();
    // Prev / next ride the same slot actions as the revealed extra controls, but stay
    // visible on the bar itself - the NetEase-style bar the user asked for keeps
    // skip controls one tap away instead of hidden behind the reveal.
    const playbackActions = useLatticePlaybackActions();
    const prevSlot = resolvePlayerControlSlot('prev', playbackActions);
    const nextSlot = resolvePlayerControlSlot('next', playbackActions);
    const PrevIcon = prevSlot.icon;
    const NextIcon = nextSlot.icon;
    const isCurrentSong = Boolean(
        currentSong && getPlaybackSongKey(currentSong) === getPlaybackSongKey(tile.song),
    );
    const canControlCurrent = isCurrentSong && canTogglePlayback;
    const isPlaying = canControlCurrent && playerState === PlayerState.PLAYING;
    const duration = canControlCurrent
        ? playbackDuration
        : Math.max(0, tile.song.durationMs / 1000);

    return (
        <div
            // 思索靠这个属性认出整条控制条。类名会随样式重构改名，属性不会 —— 见 ponderSelectorContract。
            data-ponder="lattice-chrome"
            className={`lattice-chrome ${revealed ? 'is-revealed' : ''}`}
            role="group"
            aria-label={t('home.latticePlaybackControls')}
        >
            <div className="lattice-chrome-transport">
                <button
                    type="button"
                    className="lattice-now-button"
                    onClick={onOpenPlayer}
                    aria-label={t('home.latticeOpenPlayer')}
                    title={t('home.latticeOpenPlayer')}
                >
                    {tile.coverUrl ? (
                        <img className="lattice-now-cover" src={tile.coverUrl} alt="" draggable={false} />
                    ) : (
                        <span className="lattice-now-cover lattice-now-cover-fallback">
                            <Music2 size={20} />
                        </span>
                    )}
                    <span className="lattice-now-meta">
                        <span className="lattice-now-title">{tile.title}</span>
                        <span className="lattice-now-artist">{tile.artist}</span>
                    </span>
                </button>
                <button
                    type="button"
                    className="lattice-transport-button"
                    disabled={!canControlCurrent || prevSlot.disabled}
                    onClick={() => prevSlot.onActivate()}
                    aria-label={t(prevSlot.labelKey)}
                    title={t(prevSlot.labelKey)}
                >
                    <PrevIcon size={22} fill={prevSlot.filled ? 'currentColor' : 'none'} />
                </button>
                <button
                    type="button"
                    className="lattice-transport-button"
                    onClick={() => canControlCurrent ? onTogglePlayback() : onPlay(tile)}
                    aria-label={isPlaying ? t('player.pause') : t('player.play')}
                    title={isPlaying ? t('player.pause') : t('player.play')}
                >
                    {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                </button>
                <button
                    type="button"
                    className="lattice-transport-button"
                    disabled={!canControlCurrent || nextSlot.disabled}
                    onClick={() => nextSlot.onActivate()}
                    aria-label={t(nextSlot.labelKey)}
                    title={t(nextSlot.labelKey)}
                >
                    <NextIcon size={22} fill={nextSlot.filled ? 'currentColor' : 'none'} />
                </button>
                <div className="lattice-chrome-details" inert={!revealed} aria-hidden={!revealed}>
                    <LatticeExtraControls disabled={!canControlCurrent} />
                </div>
                <LatticeChromeTime currentTime={canControlCurrent ? currentTime : idleTime} duration={duration} />
            </div>
            <div className="lattice-progress">
                <ProgressBar
                    currentTime={canControlCurrent ? currentTime : idleTime}
                    duration={duration}
                    onSeek={canControlCurrent ? onSeek : ignoreSeek}
                    primaryColor="var(--lattice-chrome-ink)"
                    secondaryColor="var(--lattice-chrome-ink)"
                    trackColor="color-mix(in srgb, var(--lattice-chrome-ink) 20%, transparent)"
                    disabled={!canControlCurrent}
                    edgeStyle="square"
                />
            </div>
        </div>
    );
}
