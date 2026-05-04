(function() {
    var pixelId = '25df94c6-84f3-49ab-8364-4c7014ecf418';
    var script = document.createElement('script');
    script.src = 'https://cdn.axon.ai/axon.js';
    script.async = true;
    document.head.appendChild(script);
    window.Axon = window.Axon || function() { (window.Axon.q = window.Axon.q || []).push(arguments) };
    script.onload = function() {
        Axon('init', pixelId);
        Axon('track', 'PageView');
    };
})();
