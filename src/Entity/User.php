<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\OpenApi\Model\Operation;
use App\Controller\SteamAuthController;
use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[
    ApiResource(
        operations: [],
        formats: ['json'],
        normalizationContext: ['user:read'],
        denormalizationContext: ['user:write'],
    ),
    Get(
        uriTemplate: '/auth-via-steam',
        controller: SteamAuthController::class,
        openapi: new Operation(
            parameters: [
                [
                    "name" => "openid.ns",
                    "in" => "query",
                    "description" => "",
                    "required" => "true",
                    "type" => "string",
                ],
                [
                    "name" => "openid.mode",
                    "in" => "query",
                    "description" => "",
                    "required" => "true",
                    "type" => "string",
                ],
                [
                    "name" => "openid.op_endpoint",
                    "in" => "query",
                    "description" => "",
                    "required" => "true",
                    "type" => "string",
                ],
            ]
        ),
        normalizationContext: ['wtf'],
        read: false,
        name: 'auth-via-steam',
    ),
]
class User
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['user:read'])]
    private ?Uuid $id;

    #[Groups(['wtf'])]
    private string $something = 'aaaaaa';

    public function __construct(?Uuid $id = null)
    {
        $this->id = $id ?? Uuid::v7();
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getSomething(): string
    {
        return $this->something;
    }
}