$(document).on("change", "#id_upload_image_file", function(evt) {
    var $preview = $('#image_preview');
    var $container = $('#preview-container');
    $preview[0].src = URL.createObjectURL(this.files[0]);
    $container.fadeIn();
    $('.custom-file-container').hide();
});

$('form').on('submit', function(e){
    $('#imageUpload').prop("disabled", true);
    $('#imageUpload').html('Uploading Image&nbsp;<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span><span class="sr-only">Loading...</span>');
});