"""v2.72 experimental WAV contract; no audio playback, imports or side effects."""
import io
import wave

MAX_WAV_BYTES = 3_000_000
MAX_FRAMES = 22050 * 60


def decode_pcm_wav(data):
    """Reject malformed or non-22.05kHz mono 16-bit RIFF WAV before NVDA feed."""
    if not isinstance(data, bytes) or not (44 <= len(data) <= MAX_WAV_BYTES):
        raise ValueError('Invalid local WAV size')
    if data[0:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise ValueError('Invalid RIFF header')
    if int.from_bytes(data[4:8], 'little') != len(data) - 8:
        raise ValueError('Inconsistent RIFF length')
    if data[12:16] != b'fmt ' or data[36:40] != b'data':
        raise ValueError('Unexpected WAV layout')
    if int.from_bytes(data[16:20], 'little') != 16:
        raise ValueError('Unsupported fmt chunk')
    if int.from_bytes(data[40:44], 'little') != len(data) - 44:
        raise ValueError('Inconsistent PCM length')
    with wave.open(io.BytesIO(data), 'rb') as reader:
        if (reader.getnchannels(), reader.getsampwidth(), reader.getframerate(), reader.getcomptype()) != (1, 2, 22050, 'NONE'):
            raise ValueError('Unexpected audio format')
        frames = reader.getnframes()
        if frames > MAX_FRAMES:
            raise ValueError('Too much audio')
        pcm = reader.readframes(frames)
    if len(pcm) != len(data) - 44 or len(pcm) != frames * 2:
        raise ValueError('Truncated PCM')
    return pcm
