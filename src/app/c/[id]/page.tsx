import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReportButton from '@/components/ReportButton';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await props.params;
  const { data: audioClip } = await supabase
    .from('audio_clips')
    .select('id, title, storage_path')
    .eq('id', id)
    .single();
  if (!audioClip) return {};
  const audioUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/recordings/${audioClip.storage_path}`;
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/c/${audioClip.id}`;
  const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/default-preview-image.png`;
  const title = audioClip.title || 'An audio recording';
  const description = `Listen to this audio clip. Recorded on AudioTweet.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [imageUrl],
    },
    twitter: {
      card: 'player',
      site: '@YourAppHandle',
      title,
      description,
      players: [
        {
          playerUrl: `${pageUrl}?player=true`,
          width: 500,
          height: 200,
          streamUrl: audioUrl,
          // streamContentType: 'audio/mp3', // Remove if not supported by the type
        }
      ],
      images: [imageUrl],
    },
  };
}

export default async function Page(
  props: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const { id } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const { data: audioClip } = await supabase
    .from('audio_clips')
    .select('id, title, storage_path')
    .eq('id', id)
    .single();
  if (!audioClip) return notFound();
  const audioUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/recordings/${audioClip.storage_path}`;
  const title = audioClip.title || 'An audio recording';
  const isPlayer = searchParams['player'] === 'true';
  if (isPlayer) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6fa' }}>
        <audio controls autoPlay src={audioUrl} style={{ width: '100%' }} />
      </div>
    );
  }
  return (
    <div className="max-w-lg mx-auto py-10 px-4 text-center">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <audio controls src={audioUrl} className="w-full my-4" />
      <p className="mb-4">Share this link on X to create an embedded audio player.</p>
      <ReportButton />
    </div>
  );
} 