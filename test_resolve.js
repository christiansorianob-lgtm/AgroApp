try {
    console.log('Resolving tailwindcss...');
    console.log(require.resolve('tailwindcss'));
    console.log('Resolved successfully.');
} catch (e) {
    console.error('Failed to resolve:');
    console.error(e.message);
}
