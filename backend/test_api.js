import axios from 'axios';

async function testApi() {
    try {
        console.log('📡 Testing /api/collections...');
        const response = await axios.get('http://localhost:3000/api/collections');
        console.log('✅ /api/collections Response:', {
            status: response.status,
            success: response.data.success,
            count: response.data.count,
            categories: response.data.categories,
            dataType: typeof response.data.data,
            isArray: Array.isArray(response.data.data)
        });

        if (response.data.data && response.data.data.length > 0) {
            console.log('📄 First Item Category:', response.data.data[0].category);
            console.log('📄 First Item Gender:', response.data.data[0].gender);
        }

        console.log('\n📡 Testing /api/products...');
        const responseProducts = await axios.get('http://localhost:3000/api/products');
        console.log('✅ /api/products Response:', {
            status: responseProducts.status,
            success: responseProducts.data.success,
            count: responseProducts.data.count,
            hasOrganized: !!responseProducts.data.organized
        });

        if (responseProducts.data.organized) {
            console.log('📦 Organized counts:', {
                men: responseProducts.data.organized.men?.length,
                women: responseProducts.data.organized.women?.length,
                kids: responseProducts.data.organized.kids?.length,
                all: responseProducts.data.organized.all?.length
            });
        }
    } catch (error) {
        console.error('❌ API Test Failed:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

testApi();
