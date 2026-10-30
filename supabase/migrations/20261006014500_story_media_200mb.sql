-- story-media bucket: yüksek kalite video için 200 MB

update storage.buckets
set file_size_limit = 209715200
where id = 'story-media';
