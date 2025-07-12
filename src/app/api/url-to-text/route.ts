import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024, // 5MB limit
    });

    const dom = new JSDOM(response.data);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json(
        { error: 'Could not extract readable content from the URL' },
        { status: 400 }
      );
    }

    const textContent = article.textContent || '';

    // No longer truncate - we can handle long audio now
    return NextResponse.json({ 
      text: textContent,
      title: article.title || 'Untitled',
      originalLength: textContent.length,
      truncated: false
    });

  } catch (error) {
    console.error('URL scraping error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND') {
        return NextResponse.json(
          { error: 'Website not found. Please check the URL.' },
          { status: 400 }
        );
      }
      if (error.code === 'ECONNABORTED') {
        return NextResponse.json(
          { error: 'Request timeout. The website took too long to respond.' },
          { status: 408 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to extract text from URL. Please check if the URL is valid and accessible.' },
      { status: 500 }
    );
  }
}