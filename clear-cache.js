const fs = require('fs');
const path = require('path');

function clearCache() {
  console.log('🧹 清除快取...\n');
  
  const cacheDir = path.join(process.cwd(), 'data', 'cache');
  
  if (fs.existsSync(cacheDir)) {
    try {
      // 遞迴刪除快取目錄
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('✅ 快取已清除');
      console.log(`🗂️  刪除目錄: ${cacheDir}`);
    } catch (error) {
      console.error('❌ 清除快取失敗:', error.message);
    }
  } else {
    console.log('ℹ️  快取目錄不存在，無需清除');
  }
  
  console.log('\n🔄 請重新啟動伺服器以取得最新資料');
}

clearCache();
