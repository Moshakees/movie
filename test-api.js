const EXTERNAL_API = 'https://kira-api.xo.je/akwam.php';

async function testFetch() {
    try {
        const query = new URLSearchParams({ action: 'featured' }).toString();
        console.log('Fetching:', `${EXTERNAL_API}?${query}`);
        const res = await fetch(`${EXTERNAL_API}?${query}`);
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Raw Response:', text.substring(0, 200) + '...');
        const data = JSON.parse(text);
        console.log('JSON parsed, count:', data.count, 'status:', data.status);
    } catch (e) {
        console.error('Error fetching API:', e.message);
    }
}

testFetch();
