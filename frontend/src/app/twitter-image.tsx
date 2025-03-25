import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'starscout - AI-Powered GitHub Stars Search';
export const size = {
    width: 1200,
    height: 675, // Twitter prefers 1.91:1 aspect ratio
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0A0A0A',
                    backgroundImage: 'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)',
                    backgroundSize: '100px 100px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 40,
                    }}
                >
                    <svg
                        width="80"
                        height="80"
                        viewBox="0 0 32 32"
                        fill="none"
                        style={{ marginRight: 20 }}
                    >
                        <path
                            d="M16 2L20.2 10.6L29.6 12L22.8 18.6L24.4 28L16 23.6L7.6 28L9.2 18.6L2.4 12L11.8 10.6L16 2Z"
                            fill="white"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <h1
                        style={{
                            fontSize: 80,
                            background: 'linear-gradient(to bottom right, #FFFFFF 30%, #999999 100%)',
                            backgroundClip: 'text',
                            color: 'transparent',
                            lineHeight: '1.2',
                            letterSpacing: '-0.05em',
                        }}
                    >
                        starscout
                    </h1>
                </div>
                <p
                    style={{
                        fontSize: 40,
                        color: '#888888',
                        textAlign: 'center',
                        maxWidth: '80%',
                    }}
                >
                    AI-Powered GitHub Stars Search
                </p>
            </div>
        ),
        {
            ...size,
        }
    );
} 