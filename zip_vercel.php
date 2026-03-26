<?php
$zipArchive = new ZipArchive();
// تحديد مسار واسم الملف المضغوط
$zipFilePath = __DIR__ . '/vercel_project.zip';

if ($zipArchive->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    die("<h2 dir='rtl'>تعذر إنشاء الملف المضغوط. تأكد من إعطاء الصلاحيات الكافية.</h2>");
}

$iterator = new RecursiveDirectoryIterator(__DIR__, RecursiveDirectoryIterator::SKIP_DOTS);
$files = new RecursiveIteratorIterator($iterator, RecursiveIteratorIterator::SELF_FIRST);

// المجلدات والملفات غير الضرورية للرفع على Vercel يتم استثناؤها لتسريع الرفع
$excludeItems = [
    'node_modules', 
    '.next', 
    '.vercel', 
    '.git', 
    'php-template', 
    'html-template', 
    'يوزر بوت', 
    'zip_vercel.php', 
    'vercel_project.zip'
];

foreach ($files as $file) {
    $filePath = $file->getRealPath();
    // إيجاد المسار النسبي وعزل المسار الأساسي
    $relativePath = substr($filePath, strlen(__DIR__) + 1);
    $relativePath = str_replace('\\', '/', $relativePath);

    $excluded = false;
    foreach ($excludeItems as $exc) {
        if ($relativePath === $exc || strpos($relativePath, $exc . '/') === 0) {
            $excluded = true;
            break;
        }
    }
    
    // استثناء أي ملفات ينتهي امتدادها بـ zip لتجنب تضمينها بشكل خاطئ
    if ($excluded || pathinfo($relativePath, PATHINFO_EXTENSION) === 'zip') {
        continue;
    }

    if ($file->isDir()) {
        $zipArchive->addEmptyDir($relativePath);
    } else {
        $zipArchive->addFile($filePath, $relativePath);
    }
}

$zipArchive->close();

echo "<div dir='rtl' style='font-family: Arial, sans-serif; padding: 20px;'>";
echo "<h2 style='color: green;'>تم تجهيز وضغط ملفات الموقع الرسمي (Next.js) بنجاح!</h2>";
echo "<p>تم استخراج المجلدات غير الضرورية (مثل <code>node_modules</code> و <code>.next</code>) ليكون حجم الملف خفيفاً ومناسباً لـ Vercel.</p>";
echo "<p>يمكنك الآن العثور على ملف <strong>vercel_project.zip</strong> في المجلد الرئيسي لمشروعك، وهو جاهز للرفع على Vercel.</p>";
echo "</div>";
?>
