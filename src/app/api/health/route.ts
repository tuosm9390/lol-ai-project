import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.RIOT_API_KEY;
  const issueTime = process.env.RIOT_API_ISSUED_TIME;
  
  if (!apiKey) {
    return NextResponse.json({
      status: 'error',
      message: 'API key not configured',
      action: 'Set RIOT_API_KEY environment variable'
    }, { status: 500 });
  }

  // API 키 만료 시간 확인 (24시간)
  if (issueTime) {
    const issued = new Date(issueTime);
    const now = new Date();
    const hoursSinceIssued = (now.getTime() - issued.getTime()) / (1000 * 60 * 60);
    const hoursUntilExpiry = 24 - hoursSinceIssued;
    
    return NextResponse.json({
      status: 'ok',
      apiKeyExists: true,
      issuedTime: issueTime,
      hoursUntilExpiry: Math.round(hoursUntilExpiry * 100) / 100,
      needsRenewal: hoursUntilExpiry < 2, // 2시간 이내일 경우 경고
      message: hoursUntilExpiry < 2 
        ? 'API key expires soon! Please renew manually.'
        : 'API key is valid'
    });
  }

  return NextResponse.json({
    status: 'ok',
    apiKeyExists: true,
    message: 'API key configured (expiration time unknown)'
  });
}
